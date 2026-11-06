import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../../src/config/index.js";
import { loadDatabase, type Db } from "../../../../src/infrastructure/database/prisma/db.js";
import { loadRedisEventBus, type RedisEventBus } from "../../../../src/infrastructure/event-bus/redis/redis.js";
import { RealtimeContainer } from "../../../../src/modules/realtime/container/realtime.container.js";
import {
    buildNotificationEvent,
    buildSlotStatusEvent,
} from "../../../../src/modules/realtime/test-utils/factory/realtime.factory.js";
import type { Role } from "../../../../src/shared/auth/roles.js";
import { createTestApp, type TestApp } from "../../../utils/app/create-test-app.js";
import { createAccessToken, createExpiredAccessToken } from "../../../utils/factory/jwt/jwt.js";

const RETRY = "retry: 5000\n\n";

interface OpenStream {
    readonly response: Response;
    readonly text: () => string;
    readonly waitFor: (fragment: string, timeoutMs?: number) => Promise<void>;
    readonly ended: () => boolean;
    readonly waitUntilEnded: (timeoutMs?: number) => Promise<void>;
    readonly abort: () => void;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const until = async (predicate: () => boolean, timeoutMs: number, message: string): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) throw new Error(message);
        await sleep(10);
    }
};

describe("realtime routes (e2e)", () => {
    const config = loadConfig();
    const keyPrefix = `gtnic-it:${randomUUID()}:`;
    const openStreams: OpenStream[] = [];
    const servers: Server[] = [];
    const buses: RedisEventBus[] = [];
    const apps: TestApp[] = [];
    let db: Db;

    interface Instance {
        readonly container: RealtimeContainer;
        readonly url: string;
    }

    const startInstance = async (http: Parameters<typeof createTestApp>[0]["http"] = {}): Promise<Instance> => {
        const eventBus = await loadRedisEventBus({ ...config.REDIS, KEY_PREFIX: keyPrefix });
        buses.push(eventBus);
        let container: RealtimeContainer | undefined;
        const testApp = await createTestApp({
            db,
            http,
            adapters: { eventBus },
            mount: deps => {
                container = new RealtimeContainer(deps);
                return [container.router];
            },
        });
        apps.push(testApp);
        const realtime = container as RealtimeContainer;
        await realtime.service.start();
        const server = testApp.app.listen(0);
        servers.push(server);
        await new Promise(resolve => server.once("listening", resolve));
        return { container: realtime, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
    };

    const open = async (url: string, init: { token?: string | null; query?: string } = {}): Promise<OpenStream> => {
        const controller = new AbortController();
        const headers: Record<string, string> = {};
        if (init.token !== null && init.query === undefined) {
            headers["Authorization"] = `Bearer ${init.token}`;
        }
        const response = await fetch(`${url}/api/realtime/stream${init.query ?? ""}`, {
            headers,
            signal: controller.signal,
        });
        let received = "";
        let finished = false;
        const reader = response.status === 200 ? response.body?.getReader() : undefined;
        if (reader !== undefined) {
            const decoder = new TextDecoder();
            void (async () => {
                try {
                    for (;;) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        received += decoder.decode(value, { stream: true });
                    }
                } catch {
                    received += "";
                } finally {
                    finished = true;
                }
            })();
        }
        const stream: OpenStream = {
            response,
            text: () => received,
            waitFor: (fragment, timeoutMs = 3000) =>
                until(
                    () => received.includes(fragment),
                    timeoutMs,
                    `timed out waiting for ${JSON.stringify(fragment)}`,
                ),
            ended: () => finished,
            waitUntilEnded: (timeoutMs = 3000) => until(() => finished, timeoutMs, "the stream did not end"),
            abort: () => controller.abort(),
        };
        openStreams.push(stream);
        return stream;
    };

    const token = (userId: string, role: Role = "CUSTOMER") =>
        createAccessToken({ sub: { userId, name: userId }, role });

    beforeAll(async () => {
        db = await loadDatabase(config.DATABASE);
    });

    afterEach(() => {
        openStreams.splice(0).forEach(stream => stream.abort());
    });

    afterAll(async () => {
        servers.forEach(server => server.closeAllConnections());
        await Promise.all(apps.map(app => app.close()));
        await Promise.all(buses.map(bus => bus.close()));
        await db?.close();
    });

    it("opens an event stream with the right headers and the reconnect hint first", async () => {
        const { url } = await startInstance();

        const stream = await open(url, { token: token("user-a") });
        await stream.waitFor(RETRY);

        expect(stream.response.status).toBe(200);
        expect(stream.response.headers.get("content-type")).toBe("text/event-stream");
        expect(stream.response.headers.get("cache-control")).toBe("no-cache, no-transform");
        expect(stream.response.headers.get("x-accel-buffering")).toBe("no");
        expect(stream.text()).toBe(RETRY);
    });

    it("delivers an event addressed to a user only to that user's streams", async () => {
        const { url, container } = await startInstance();
        const siti = await open(url, { token: token("siti") });
        const budi = await open(url, { token: token("budi") });
        await Promise.all([siti.waitFor(RETRY), budi.waitFor(RETRY)]);
        const event = buildSlotStatusEvent();

        await container.service.publish({ userIds: ["siti"] }, event);
        await container.service.publish({ userIds: ["budi"] }, buildNotificationEvent());
        await budi.waitFor("event: notification");

        expect(siti.text()).toBe(`${RETRY}event: slot.status\ndata: ${JSON.stringify(event.data)}\n\n`);
        expect(budi.text()).not.toContain("slot.status");
    });

    it("delivers a role-addressed event to every stream with that role", async () => {
        const { url, container } = await startInstance();
        const kitchen = await open(url, { token: token("kitchen-1", "KITCHEN") });
        const admin = await open(url, { token: token("admin-1", "ADMIN") });
        const customer = await open(url, { token: token("siti") });
        await Promise.all([kitchen.waitFor(RETRY), admin.waitFor(RETRY), customer.waitFor(RETRY)]);

        await container.service.publish({ roles: ["KITCHEN", "ADMIN"] }, buildSlotStatusEvent());
        await container.service.publish({ userIds: ["siti"] }, buildNotificationEvent());
        await customer.waitFor("event: notification");

        await kitchen.waitFor("event: slot.status");
        await admin.waitFor("event: slot.status");
        expect(customer.text()).not.toContain("slot.status");
    });

    it("sends an event once to a stream that matches both its user id and its role", async () => {
        const { url, container } = await startInstance();
        const admin = await open(url, { token: token("admin-1", "ADMIN") });
        await admin.waitFor(RETRY);

        await container.service.publish({ userIds: ["admin-1"], roles: ["ADMIN"] }, buildSlotStatusEvent());
        await admin.waitFor("event: slot.status");
        await sleep(100);

        expect(admin.text().split("event: slot.status")).toHaveLength(2);
    });

    it("accepts the token as ?accessToken= for EventSource clients", async () => {
        const { url } = await startInstance();

        const stream = await open(url, { query: `?accessToken=${token("siti")}` });
        await stream.waitFor(RETRY);

        expect(stream.response.status).toBe(200);
    });

    it("refuses a request with no token, a bad token or an expired token", async () => {
        const { url } = await startInstance();

        const missing = await open(url, { token: null });
        const bad = await open(url, { token: "not.a.jwt" });
        const expired = await open(url, { token: createExpiredAccessToken({ role: "CUSTOMER" }) });

        expect(missing.response.status).toBe(401);
        expect(bad.response.status).toBe(401);
        expect(expired.response.status).toBe(401);
        await expect(missing.response.json()).resolves.toMatchObject({ error: { code: "MISSING_TOKEN" } });
        await expect(bad.response.json()).resolves.toMatchObject({ error: { code: "INVALID_TOKEN" } });
        await expect(expired.response.json()).resolves.toMatchObject({ error: { code: "TOKEN_EXPIRED" } });
    });

    it("delivers across API instances and from a process that holds no streams", async () => {
        const first = await startInstance();
        const second = await startInstance();
        const worker = await loadRedisEventBus({ ...config.REDIS, KEY_PREFIX: keyPrefix });
        buses.push(worker);
        const onFirst = await open(first.url, { token: token("siti") });
        const onSecond = await open(second.url, { token: token("siti") });
        await Promise.all([onFirst.waitFor(RETRY), onSecond.waitFor(RETRY)]);

        await first.container.service.publish({ userIds: ["siti"] }, buildSlotStatusEvent());
        await onFirst.waitFor("event: slot.status");
        await onSecond.waitFor("event: slot.status");

        await worker.publish(
            "realtime",
            JSON.stringify({ audience: { userIds: ["siti"] }, event: buildNotificationEvent() }),
        );
        await onFirst.waitFor("event: notification");
        await onSecond.waitFor("event: notification");
    });

    it("keeps streams alive with pings", async () => {
        const { url } = await startInstance({ REALTIME_PING_INTERVAL_SECONDS: 1 });
        const stream = await open(url, { token: token("siti") });

        await stream.waitFor(": ping\n\n", 3000);
    });

    it("closes the oldest stream of a user past the per-user limit", async () => {
        const { url } = await startInstance({ REALTIME_MAX_CONNECTIONS_PER_USER: 2 });
        const first = await open(url, { token: token("siti") });
        await first.waitFor(RETRY);
        const second = await open(url, { token: token("siti") });
        await second.waitFor(RETRY);

        const third = await open(url, { token: token("siti") });
        await third.waitFor(RETRY);

        await first.waitUntilEnded();
        expect(second.ended()).toBe(false);
        expect(third.ended()).toBe(false);
    });

    it("answers 503 when the server is full", async () => {
        const { url } = await startInstance({ REALTIME_MAX_CONNECTIONS: 1 });
        const first = await open(url, { token: token("siti") });
        await first.waitFor(RETRY);

        const refused = await fetch(`${url}/api/realtime/stream`, {
            headers: { Authorization: `Bearer ${token("budi")}` },
        });

        expect(refused.status).toBe(503);
        await expect(refused.json()).resolves.toMatchObject({ error: { code: "SERVICE_UNAVAILABLE" } });
    });

    it("ends the stream when the access token expires", async () => {
        const { url } = await startInstance();
        const shortLived = createAccessToken(
            { sub: { userId: "siti", name: "siti" }, role: "CUSTOMER" },
            { EXPIRES_IN: "2s" },
        );
        const stream = await open(url, { token: shortLived });
        await stream.waitFor(RETRY);

        await stream.waitUntilEnded(4000);
    });

    it("ends every open stream on close so the server can shut down", async () => {
        const { url, container } = await startInstance();
        const stream = await open(url, { token: token("siti") });
        await stream.waitFor(RETRY);

        await container.service.close();

        await stream.waitUntilEnded();
    });
});

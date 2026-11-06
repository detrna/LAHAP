import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import { loadRedisEventBus, type RedisEventBus } from "./redis.js";

const config = loadConfig();

const waitFor = async (predicate: () => boolean, timeoutMs = 2000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    while (!predicate()) {
        if (Date.now() > deadline) {
            throw new Error("timed out waiting for a message");
        }
        await new Promise(resolve => setTimeout(resolve, 10));
    }
};

describe("RedisEventBus (integration)", () => {
    const keyPrefix = `gtnic-it:${randomUUID()}:`;
    let bus: RedisEventBus;
    let other: RedisEventBus;

    beforeAll(async () => {
        bus = await loadRedisEventBus({ ...config.REDIS, KEY_PREFIX: keyPrefix });
        other = await loadRedisEventBus({ ...config.REDIS, KEY_PREFIX: keyPrefix });
    });

    afterAll(async () => {
        await bus?.close();
        await other?.close();
    });

    it("delivers a published message to subscribers in every process", async () => {
        const received: string[] = [];
        const receivedByOther: string[] = [];
        await bus.subscribe("realtime", message => received.push(message));
        await other.subscribe("realtime", message => receivedByOther.push(message));

        await other.publish("realtime", "hello");

        await waitFor(() => received.length === 1 && receivedByOther.length === 1);
        expect(received).toEqual(["hello"]);
        expect(receivedByOther).toEqual(["hello"]);
    });

    it("keeps buses with different prefixes apart", async () => {
        const stranger = await loadRedisEventBus({ ...config.REDIS, KEY_PREFIX: `gtnic-it:${randomUUID()}:` });
        const received: string[] = [];
        const strangerReceived: string[] = [];
        await bus.subscribe("isolation", message => received.push(message));
        await stranger.subscribe("isolation", message => strangerReceived.push(message));

        await bus.publish("isolation", "mine");

        await waitFor(() => received.length === 1);
        await new Promise(resolve => setTimeout(resolve, 100));
        expect(strangerReceived).toEqual([]);
        await stranger.close();
    });

    it("publishes on a channel named with the key prefix", async () => {
        const raw = new Redis(config.REDIS.URL);
        const seen: string[] = [];
        raw.on("message", (channel: string) => seen.push(channel));
        await raw.subscribe(`${keyPrefix}named`);

        await bus.publish("named", "x");

        await waitFor(() => seen.length === 1);
        expect(seen).toEqual([`${keyPrefix}named`]);
        await raw.quit();
    });

    it("stops delivering after the handler unsubscribes", async () => {
        const received: string[] = [];
        const leave = await bus.subscribe("leaving", message => received.push(message));
        await bus.publish("leaving", "first");
        await waitFor(() => received.length === 1);

        await leave();
        await bus.publish("leaving", "second");
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(received).toEqual(["first"]);
    });
});

import { Redis } from "ioredis";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RedisConfig } from "../../../config/redis.js";
import { EventBusFailureError } from "../../../shared/ports/event-bus/event-bus.js";
import { loadRedisEventBus, RedisEventBus } from "./redis.js";

const dummyConfig: RedisConfig = {
    URL: "redis://localhost:6379",
    PORT: 6379,
    KEY_PREFIX: "gtnic-test:",
    CONNECT_TIMEOUT_MS: 10_000,
    MAX_RETRIES: 3,
};

const emit = (bus: RedisEventBus, channel: string, message: string): void => {
    bus["subscriber"].emit("message", channel, message);
};

describe("RedisEventBus (unit)", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("throws when REDIS_URL is empty", () => {
        expect(() => new RedisEventBus({ ...dummyConfig, URL: "   " })).toThrow("REDIS_URL is not set");
    });

    describe("publish", () => {
        it("publishes on the prefixed channel", async () => {
            const publishSpy = vi.spyOn(Redis.prototype, "publish").mockResolvedValueOnce(1);
            const bus = new RedisEventBus(dummyConfig);

            await bus.publish("realtime", "payload");

            expect(publishSpy).toHaveBeenCalledWith("gtnic-test:realtime", "payload");
        });

        it("wraps Redis failures in EventBusFailureError", async () => {
            const cause = new Error("boom");
            vi.spyOn(Redis.prototype, "publish").mockRejectedValueOnce(cause);
            const bus = new RedisEventBus(dummyConfig);

            const error = await bus.publish("realtime", "payload").catch((e: unknown) => e);

            expect(error).toBeInstanceOf(EventBusFailureError);
            expect((error as EventBusFailureError).operation).toBe("publish");
            expect((error as EventBusFailureError).cause).toBe(cause);
        });
    });

    describe("subscribe", () => {
        it("subscribes once per channel and delivers messages to every handler", async () => {
            const subscribeSpy = vi.spyOn(Redis.prototype, "subscribe").mockResolvedValue(1);
            const bus = new RedisEventBus(dummyConfig);
            const first = vi.fn();
            const second = vi.fn();

            await bus.subscribe("realtime", first);
            await bus.subscribe("realtime", second);
            emit(bus, "gtnic-test:realtime", "hello");

            expect(subscribeSpy).toHaveBeenCalledTimes(1);
            expect(subscribeSpy).toHaveBeenCalledWith("gtnic-test:realtime");
            expect(first).toHaveBeenCalledWith("hello");
            expect(second).toHaveBeenCalledWith("hello");
        });

        it("ignores messages from other channels", async () => {
            vi.spyOn(Redis.prototype, "subscribe").mockResolvedValue(1);
            const bus = new RedisEventBus(dummyConfig);
            const handler = vi.fn();

            await bus.subscribe("realtime", handler);
            emit(bus, "other:realtime", "hello");

            expect(handler).not.toHaveBeenCalled();
        });

        it("keeps delivering to other handlers when one throws", async () => {
            vi.spyOn(Redis.prototype, "subscribe").mockResolvedValue(1);
            const bus = new RedisEventBus(dummyConfig);
            const broken = vi.fn(() => {
                throw new Error("handler failed");
            });
            const healthy = vi.fn();

            await bus.subscribe("realtime", broken);
            await bus.subscribe("realtime", healthy);
            emit(bus, "gtnic-test:realtime", "hello");

            expect(healthy).toHaveBeenCalledWith("hello");
        });

        it("unsubscribes from Redis only when the last handler leaves", async () => {
            vi.spyOn(Redis.prototype, "subscribe").mockResolvedValue(1);
            const unsubscribeSpy = vi.spyOn(Redis.prototype, "unsubscribe").mockResolvedValue(0);
            const bus = new RedisEventBus(dummyConfig);
            const first = vi.fn();
            const second = vi.fn();

            const leaveFirst = await bus.subscribe("realtime", first);
            const leaveSecond = await bus.subscribe("realtime", second);
            await leaveFirst();

            expect(unsubscribeSpy).not.toHaveBeenCalled();
            emit(bus, "gtnic-test:realtime", "hello");
            expect(first).not.toHaveBeenCalled();
            expect(second).toHaveBeenCalledWith("hello");

            await leaveSecond();

            expect(unsubscribeSpy).toHaveBeenCalledWith("gtnic-test:realtime");
        });

        it("forgets the handler and throws EventBusFailureError when subscribing fails", async () => {
            vi.spyOn(Redis.prototype, "subscribe").mockRejectedValueOnce(new Error("boom"));
            const bus = new RedisEventBus(dummyConfig);
            const handler = vi.fn();

            await expect(bus.subscribe("realtime", handler)).rejects.toBeInstanceOf(EventBusFailureError);
            emit(bus, "gtnic-test:realtime", "hello");

            expect(handler).not.toHaveBeenCalled();
        });

        it("wraps unsubscribe failures in EventBusFailureError", async () => {
            vi.spyOn(Redis.prototype, "subscribe").mockResolvedValue(1);
            vi.spyOn(Redis.prototype, "unsubscribe").mockRejectedValueOnce(new Error("boom"));
            const bus = new RedisEventBus(dummyConfig);

            const leave = await bus.subscribe("realtime", vi.fn());

            await expect(leave()).rejects.toBeInstanceOf(EventBusFailureError);
        });
    });

    describe("close", () => {
        it("disconnects clients that never connected", async () => {
            const disconnectSpy = vi.spyOn(Redis.prototype, "disconnect").mockReturnValue(undefined);
            const quitSpy = vi.spyOn(Redis.prototype, "quit");
            const bus = new RedisEventBus(dummyConfig);

            await bus.close();

            expect(disconnectSpy).toHaveBeenCalledTimes(2);
            expect(quitSpy).not.toHaveBeenCalled();
        });

        it("stops delivering after close", async () => {
            vi.spyOn(Redis.prototype, "subscribe").mockResolvedValue(1);
            vi.spyOn(Redis.prototype, "disconnect").mockReturnValue(undefined);
            const bus = new RedisEventBus(dummyConfig);
            const handler = vi.fn();
            await bus.subscribe("realtime", handler);

            await bus.close();
            emit(bus, "gtnic-test:realtime", "hello");

            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe("loadRedisEventBus", () => {
        it("returns the bus when PING answers PONG", async () => {
            vi.spyOn(Redis.prototype, "ping").mockResolvedValueOnce("PONG");

            const bus = await loadRedisEventBus(dummyConfig);

            expect(bus).toBeInstanceOf(RedisEventBus);
            await bus.close();
        });

        it("closes the bus and rethrows when PING fails", async () => {
            vi.spyOn(Redis.prototype, "ping").mockRejectedValueOnce(new Error("down"));
            const disconnectSpy = vi.spyOn(Redis.prototype, "disconnect").mockReturnValue(undefined);

            await expect(loadRedisEventBus(dummyConfig)).rejects.toBeInstanceOf(EventBusFailureError);
            expect(disconnectSpy).toHaveBeenCalled();
        });
    });
});

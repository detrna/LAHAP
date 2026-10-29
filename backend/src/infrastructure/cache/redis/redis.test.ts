import { Redis } from "ioredis";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RedisConfig } from "../../../config/redis.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
    CacheFailureError,
    InvalidCacheKeyError,
    InvalidCacheTtlError,
} from "../../../shared/ports/cache/cache.js";
import { loadRedisCache, normalizeCacheKey, RedisCache } from "./redis.js";

const dummyConfig: RedisConfig = {
    URL: "redis://localhost:6379",
    PORT: 6379,
    KEY_PREFIX: "gtnic-test:",
    CONNECT_TIMEOUT_MS: 10_000,
    MAX_RETRIES: 3,
};

describe("RedisCache (unit)", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor & key validation", () => {
        it("throws when REDIS_URL is empty", () => {
            expect(() => new RedisCache({ ...dummyConfig, URL: "   " })).toThrow(
                "REDIS_URL is not set",
            );
        });

        it("normalizes valid keys and rejects empty or null-byte keys", () => {
            expect(normalizeCacheKey("  user:123  ")).toBe("user:123");
            expect(() => normalizeCacheKey("   ")).toThrow(InvalidCacheKeyError);
            expect(() => normalizeCacheKey("user:\0id")).toThrow(InvalidCacheKeyError);
        });
    });

    describe("set", () => {
        it("stores a key without TTL when ttlSeconds is omitted", async () => {
            const setSpy = vi.spyOn(Redis.prototype, "set").mockResolvedValueOnce("OK");
            const cache = new RedisCache(dummyConfig);

            await cache.set("  session:abc  ", "payload");

            expect(setSpy).toHaveBeenCalledWith("session:abc", "payload");
        });

        it("stores a key with EX when ttlSeconds is provided", async () => {
            const setSpy = vi.spyOn(Redis.prototype, "set").mockResolvedValueOnce("OK");
            const cache = new RedisCache(dummyConfig);

            await cache.set("session:abc", "payload", { ttlSeconds: 300 });

            expect(setSpy).toHaveBeenCalledWith("session:abc", "payload", "EX", 300);
        });

        it("throws InvalidCacheTtlError when ttlSeconds is zero, negative, or non-integer", async () => {
            const cache = new RedisCache(dummyConfig);

            await expect(cache.set("k", "v", { ttlSeconds: 0 })).rejects.toThrow(
                InvalidCacheTtlError,
            );
            await expect(cache.set("k", "v", { ttlSeconds: -10 })).rejects.toThrow(
                InvalidCacheTtlError,
            );
            await expect(cache.set("k", "v", { ttlSeconds: 1.5 })).rejects.toThrow(
                InvalidCacheTtlError,
            );
        });

        it("wraps underlying Redis set failures in CacheFailureError", async () => {
            const rootCause = new Error("connection lost");
            vi.spyOn(Redis.prototype, "set").mockRejectedValueOnce(rootCause);
            const cache = new RedisCache(dummyConfig);

            let caught: unknown;
            try {
                await cache.set("key", "value");
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeInstanceOf(CacheFailureError);
            expect(caught).toBeInstanceOf(AppError);
            const err = caught as CacheFailureError;
            expect(err.code).toBe("CACHE_FAILURE");
            expect(err.statusCode).toBe(500);
            expect(err.operation).toBe("set");
            expect(err.cause).toBe(rootCause);
        });
    });

    describe("get, exists & delete", () => {
        it("retrieves stored string or null via get", async () => {
            const getSpy = vi
                .spyOn(Redis.prototype, "get")
                .mockResolvedValueOnce("cached-value")
                .mockResolvedValueOnce(null);
            const cache = new RedisCache(dummyConfig);

            await expect(cache.get("  item:1 ")).resolves.toBe("cached-value");
            await expect(cache.get("item:missing")).resolves.toBeNull();
            expect(getSpy).toHaveBeenNthCalledWith(1, "item:1");
        });

        it("returns boolean from exists based on Redis key count", async () => {
            vi.spyOn(Redis.prototype, "exists")
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(0);
            const cache = new RedisCache(dummyConfig);

            await expect(cache.exists("item:1")).resolves.toBe(true);
            await expect(cache.exists("item:missing")).resolves.toBe(false);
        });

        it("deletes key via del", async () => {
            const delSpy = vi.spyOn(Redis.prototype, "del").mockResolvedValueOnce(1);
            const cache = new RedisCache(dummyConfig);

            await cache.delete("  item:1  ");
            expect(delSpy).toHaveBeenCalledWith("item:1");
        });

        it("wraps get, exists, and delete errors in CacheFailureError", async () => {
            const rootCause = new Error("redis timeout");
            vi.spyOn(Redis.prototype, "get").mockRejectedValueOnce(rootCause);
            vi.spyOn(Redis.prototype, "exists").mockRejectedValueOnce(rootCause);
            vi.spyOn(Redis.prototype, "del").mockRejectedValueOnce(rootCause);

            const cache = new RedisCache(dummyConfig);

            await expect(cache.get("k")).rejects.toThrow(CacheFailureError);
            await expect(cache.exists("k")).rejects.toThrow(CacheFailureError);
            await expect(cache.delete("k")).rejects.toThrow(CacheFailureError);
        });
    });

    describe("verifyConnection, loadRedisCache & close", () => {
        it("verifies connection when Redis responds with PONG", async () => {
            vi.spyOn(Redis.prototype, "ping").mockResolvedValueOnce("PONG");
            const cache = await loadRedisCache(dummyConfig);

            expect(cache).toBeInstanceOf(RedisCache);
        });

        it("throws CacheFailureError and closes client when PING fails during loadRedisCache", async () => {
            vi.spyOn(Redis.prototype, "ping").mockRejectedValueOnce(new Error("ECONNREFUSED"));
            const disconnectSpy = vi
                .spyOn(Redis.prototype, "disconnect")
                .mockImplementation(() => undefined);

            await expect(loadRedisCache(dummyConfig)).rejects.toThrow(CacheFailureError);
            expect(disconnectSpy).toHaveBeenCalled();
        });
    });
});

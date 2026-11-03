import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import { loadRedisCache, type RedisCache } from "./redis.js";

const config = loadConfig();

// Integration tests require a running Redis instance (see docker-compose.yml).
// Run with: npm run test:integration
describe("RedisCache (integration)", () => {
    let cache: RedisCache;

    beforeAll(async () => {
        cache = await loadRedisCache({
            ...config.REDIS,
            KEY_PREFIX: `gtnic-it:${randomUUID()}:`,
        });
    });

    afterAll(async () => {
        await cache?.close();
    });

    it("sets, gets, checks existence, and deletes a key", async () => {
        const key = `user:${randomUUID()}`;

        expect(await cache.exists(key)).toBe(false);
        expect(await cache.get(key)).toBeNull();

        await cache.set(key, "hello-redis", { ttlSeconds: 60 });

        expect(await cache.exists(key)).toBe(true);
        expect(await cache.get(key)).toBe("hello-redis");

        await cache.delete(key);

        expect(await cache.exists(key)).toBe(false);
        expect(await cache.get(key)).toBeNull();
    });

    it("increments a counter within one fixed window", async () => {
        const key = `counter:${randomUUID()}`;

        const first = await cache.increment(key, { ttlSeconds: 60 });
        const second = await cache.increment(key, { ttlSeconds: 60 });

        expect(first.value).toBe(1);
        expect(second.value).toBe(2);
        expect(second.expiresInSeconds).toBeGreaterThan(0);
        expect(second.expiresInSeconds).toBeLessThanOrEqual(60);

        await cache.delete(key);
        expect((await cache.increment(key, { ttlSeconds: 60 })).value).toBe(1);
        await cache.delete(key);
    });

    it("restarts the counter after the window expires", async () => {
        const key = `counter:${randomUUID()}`;

        await cache.increment(key, { ttlSeconds: 1 });
        await new Promise(resolve => setTimeout(resolve, 1_100));

        expect((await cache.increment(key, { ttlSeconds: 1 })).value).toBe(1);
        await cache.delete(key);
    });
});

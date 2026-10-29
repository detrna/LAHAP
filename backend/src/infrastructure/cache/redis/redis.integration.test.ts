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
});

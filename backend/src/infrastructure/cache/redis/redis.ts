import { Redis } from "ioredis";
import type { RedisConfig } from "../../../config/redis.js";
import type { Cache, SetCacheOptions } from "../../../shared/ports/cache/cache.js";
import {
    CacheFailureError,
    InvalidCacheKeyError,
    InvalidCacheTtlError,
} from "../../../shared/ports/cache/errors.js";

export function normalizeCacheKey(rawKey: string): string {
    const trimmed = rawKey.trim();
    if (!trimmed) {
        throw new InvalidCacheKeyError(rawKey, "cache key must not be empty");
    }
    if (trimmed.includes("\0")) {
        throw new InvalidCacheKeyError(rawKey, "cache key must not contain null bytes");
    }
    return trimmed;
}

export class RedisCache implements Cache {
    private readonly client: Redis;

    constructor(config: RedisConfig) {
        const url = config.URL.trim();
        if (!url) {
            throw new Error("REDIS_URL is not set");
        }

        this.client = new Redis(url, {
            keyPrefix: config.KEY_PREFIX,
            connectTimeout: config.CONNECT_TIMEOUT_MS,
            maxRetriesPerRequest: config.MAX_RETRIES,
            lazyConnect: true,
        });
    }

    async verifyConnection(): Promise<void> {
        try {
            const response = await this.client.ping();
            if (response !== "PONG") {
                throw new Error(`Unexpected PING response: ${response}`);
            }
        } catch (cause) {
            throw new CacheFailureError("verifyConnection", cause);
        }
    }

    async set(key: string, value: string, options?: SetCacheOptions): Promise<void> {
        const normalizedKey = normalizeCacheKey(key);
        const ttl = options?.ttlSeconds;

        if (ttl !== undefined && (!Number.isInteger(ttl) || ttl <= 0)) {
            throw new InvalidCacheTtlError(ttl);
        }

        try {
            if (ttl !== undefined) {
                await this.client.set(normalizedKey, value, "EX", ttl);
            } else {
                await this.client.set(normalizedKey, value);
            }
        } catch (cause) {
            throw new CacheFailureError("set", cause);
        }
    }

    async get(key: string): Promise<string | null> {
        const normalizedKey = normalizeCacheKey(key);
        try {
            return await this.client.get(normalizedKey);
        } catch (cause) {
            throw new CacheFailureError("get", cause);
        }
    }

    async exists(key: string): Promise<boolean> {
        const normalizedKey = normalizeCacheKey(key);
        try {
            const count = await this.client.exists(normalizedKey);
            return count > 0;
        } catch (cause) {
            throw new CacheFailureError("exists", cause);
        }
    }

    async delete(key: string): Promise<void> {
        const normalizedKey = normalizeCacheKey(key);
        try {
            await this.client.del(normalizedKey);
        } catch (cause) {
            throw new CacheFailureError("delete", cause);
        }
    }

    async close(): Promise<void> {
        try {
            if (this.client.status === "wait" || this.client.status === "end") {
                this.client.disconnect();
                return;
            }
            await this.client.quit();
        } catch (cause) {
            throw new CacheFailureError("close", cause);
        }
    }
}

export const loadRedisCache = async (config: RedisConfig): Promise<RedisCache> => {
    const cache = new RedisCache(config);
    try {
        await cache.verifyConnection();
        return cache;
    } catch (error) {
        await cache.close().catch(() => undefined);
        throw error;
    }
};


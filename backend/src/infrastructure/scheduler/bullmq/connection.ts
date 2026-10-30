import { Redis } from "ioredis";
import type { RedisConfig } from "../../../config/redis.js";

/**
 * Creates a dedicated ioredis connection for BullMQ (separate from Cache / PubSub clients).
 * BullMQ requires `maxRetriesPerRequest: null` for blocking worker commands and prohibits
 * setting `keyPrefix` on the ioredis client itself.
 */
export const createBullMqConnection = (config: RedisConfig): Redis => {
    const url = config.URL.trim();
    if (!url) {
        throw new Error("REDIS_URL is not set");
    }

    return new Redis(url, {
        connectTimeout: config.CONNECT_TIMEOUT_MS,
        maxRetriesPerRequest: null,
    });
};

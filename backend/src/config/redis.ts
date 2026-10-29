import { z } from "zod";

export interface RedisConfig {
    readonly URL: string;
    readonly PORT: number;
    readonly KEY_PREFIX: string;
    readonly CONNECT_TIMEOUT_MS: number;
    readonly MAX_RETRIES: number;
}

export const redisEnvSchema = z.object({
    REDIS_URL: z.string().default("redis://localhost:6379"),
    REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
    REDIS_KEY_PREFIX: z.string().default("gtnic:"),
    REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
    REDIS_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
});

export type RedisEnv = z.output<typeof redisEnvSchema>;

export const toRedisConfig = (env: RedisEnv): RedisConfig => ({
    URL: env.REDIS_URL,
    PORT: env.REDIS_PORT,
    KEY_PREFIX: env.REDIS_KEY_PREFIX,
    CONNECT_TIMEOUT_MS: env.REDIS_CONNECT_TIMEOUT_MS,
    MAX_RETRIES: env.REDIS_MAX_RETRIES,
});

export const loadRedisConfig = (env: NodeJS.ProcessEnv = process.env): RedisConfig =>
    toRedisConfig(redisEnvSchema.parse(env));


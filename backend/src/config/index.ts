import "dotenv/config";
import z from "zod";
import { appEnvSchema, toAppConfig, type AppConfig } from "./app.js";
import { dbEnvSchema, toDatabaseConfig, type DatabaseConfig } from "./db.js";
import { hasherEnvSchema, toHasherConfig, type HasherConfig } from "./hasher.js";
import { jwtEnvSchema, toJwtConfig, type JwtConfig } from "./jwt.js";
import { loggerEnvSchema, toLoggerConfig, type LoggerConfig } from "./logger.js";
import { objectStorageEnvSchema, toObjectStorageConfig, type ObjectStorageConfig } from "./object-storage.js";
import { paymentGatewayEnvSchema, toPaymentGatewayConfig, type PaymentGatewayConfig } from "./payment-gateway.js";
import { receiptExtractorEnvSchema, toReceiptExtractorConfig, type ReceiptExtractorConfig } from "./receipt-extractor.js";
import { redisEnvSchema, toRedisConfig, type RedisConfig } from "./redis.js";
import { schedulerEnvSchema, toSchedulerConfig, type SchedulerConfig } from "./scheduler.js";

export interface Config {
    readonly APP: AppConfig;
    readonly DATABASE: DatabaseConfig;
    readonly JWT: JwtConfig;
    readonly HASHER: HasherConfig;
    readonly LOGGER: LoggerConfig;
    readonly RECEIPT_EXTRACTOR: ReceiptExtractorConfig;
    readonly OBJECT_STORAGE: ObjectStorageConfig;
    readonly PAYMENT_GATEWAY: PaymentGatewayConfig;
    readonly REDIS: RedisConfig;
    readonly SCHEDULER: SchedulerConfig;
}

export const parseEnv = <T>(schema: { parse: (value: unknown) => T }, value: unknown = process.env) => {
    try {
        return schema.parse(value);
    } catch (error) {
        throw new Error(`Invalid environment configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
};

const envSchema = z.object({
    ...appEnvSchema.shape,
    ...dbEnvSchema.shape,
    ...jwtEnvSchema.shape,
    ...hasherEnvSchema.shape,
    ...loggerEnvSchema.shape,
    ...receiptExtractorEnvSchema.shape,
    ...objectStorageEnvSchema.shape,
    ...paymentGatewayEnvSchema.shape,
    ...redisEnvSchema.shape,
    ...schedulerEnvSchema.shape,
});

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
    const parsed = parseEnv(envSchema, env);

    return {
        APP: toAppConfig(parsed),
        DATABASE: toDatabaseConfig(parsed),
        JWT: toJwtConfig(parsed),
        HASHER: toHasherConfig(parsed),
        LOGGER: toLoggerConfig(parsed),
        RECEIPT_EXTRACTOR: toReceiptExtractorConfig(parsed),
        OBJECT_STORAGE: toObjectStorageConfig(parsed),
        PAYMENT_GATEWAY: toPaymentGatewayConfig(parsed),
        REDIS: toRedisConfig(parsed),
        SCHEDULER: toSchedulerConfig(parsed),
    };
};

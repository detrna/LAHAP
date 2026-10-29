import "dotenv/config";
import z from "zod";
import { appEnvSchema, toAppConfig, type AppConfig } from "./app.js";
import { dbEnvSchema, toDatabaseConfig, type DatabaseConfig } from "./db.js";
import { jwtEnvSchema, toJwtConfig, type JwtConfig } from "./jwt.js";
import { objectStorageEnvSchema, toObjectStorageConfig, type ObjectStorageConfig } from "./object-storage.js";
import { receiptExtractorEnvSchema, toReceiptExtractorConfig, type ReceiptExtractorConfig } from "./receipt-extractor.js";

export interface Config {
    readonly APP: AppConfig;
    readonly DATABASE: DatabaseConfig;
    readonly JWT: JwtConfig;
    readonly RECEIPT_EXTRACTOR: ReceiptExtractorConfig;
    readonly OBJECT_STORAGE: ObjectStorageConfig;
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
    ...receiptExtractorEnvSchema.shape,
    ...objectStorageEnvSchema.shape,
});

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
    const parsed = parseEnv(envSchema, env);

    return {
        APP: toAppConfig(parsed),
        DATABASE: toDatabaseConfig(parsed),
        JWT: toJwtConfig(parsed),
        RECEIPT_EXTRACTOR: toReceiptExtractorConfig(parsed),
        OBJECT_STORAGE: toObjectStorageConfig(parsed),
    };
};

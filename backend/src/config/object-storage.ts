import { z } from "zod";

export interface ObjectStorageConfig {
    readonly ENDPOINT: string;
    readonly REGION: string;
    readonly ACCESS_KEY: string;
    readonly SECRET_KEY: string;
    readonly BUCKET: string;
    readonly SIGNED_URL_EXPIRES_IN: number;
    readonly TIMEOUT_MS: number;
    readonly MAX_RETRIES: number;
}

export const objectStorageEnvSchema = z.object({
    S3_ENDPOINT: z.string().default("http://localhost:8333"),
    S3_REGION: z.string().default("us-east-1"),
    S3_ACCESS_KEY: z.string().default(""),
    S3_SECRET_KEY: z.string().default(""),
    S3_BUCKET: z.string().default("receipts"),
    S3_SIGNED_URL_EXPIRES_IN: z.coerce.number().int().positive().default(3600),
    S3_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
    S3_MAX_RETRIES: z.coerce.number().int().min(0).default(2),
});

export type ObjectStorageEnv = z.output<typeof objectStorageEnvSchema>;

export const toObjectStorageConfig = (env: ObjectStorageEnv): ObjectStorageConfig => ({
    ENDPOINT: env.S3_ENDPOINT,
    REGION: env.S3_REGION,
    ACCESS_KEY: env.S3_ACCESS_KEY,
    SECRET_KEY: env.S3_SECRET_KEY,
    BUCKET: env.S3_BUCKET,
    SIGNED_URL_EXPIRES_IN: env.S3_SIGNED_URL_EXPIRES_IN,
    TIMEOUT_MS: env.S3_TIMEOUT_MS,
    MAX_RETRIES: env.S3_MAX_RETRIES,
});

export const loadObjectStorageConfig = (env: NodeJS.ProcessEnv = process.env): ObjectStorageConfig =>
    toObjectStorageConfig(objectStorageEnvSchema.parse(env));

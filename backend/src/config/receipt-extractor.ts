import { z } from "zod";

export interface ReceiptExtractorConfig {
    readonly API_KEY: string;
    readonly BASE_URL: string;
    readonly MODEL: string;
    readonly TIMEOUT_MS: number;
    readonly MAX_RETRIES: number;
}

export const receiptExtractorEnvSchema = z.object({
    DASHSCOPE_API_KEY: z.string().default(""),
    DASHSCOPE_BASE_URL: z
        .string()
        .default("https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1"),
    DASHSCOPE_MODEL: z.string().default("qwen-vl-ocr-2025-11-20"),
    DASHSCOPE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    DASHSCOPE_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
});

export type ReceiptExtractorEnv = z.output<typeof receiptExtractorEnvSchema>;

export const toReceiptExtractorConfig = (env: ReceiptExtractorEnv): ReceiptExtractorConfig => ({
    API_KEY: env.DASHSCOPE_API_KEY,
    BASE_URL: env.DASHSCOPE_BASE_URL,
    MODEL: env.DASHSCOPE_MODEL,
    TIMEOUT_MS: env.DASHSCOPE_TIMEOUT_MS,
    MAX_RETRIES: env.DASHSCOPE_MAX_RETRIES,
});

export const loadReceiptExtractorConfig = (env: NodeJS.ProcessEnv = process.env): ReceiptExtractorConfig =>
    toReceiptExtractorConfig(receiptExtractorEnvSchema.parse(env));


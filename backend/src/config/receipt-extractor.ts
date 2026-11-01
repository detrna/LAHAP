import { z } from "zod";

export interface ReceiptExtractorConfig {
    readonly API_KEY: string;
    readonly BASE_URL: string;
    readonly MODEL: string;
    readonly TIMEOUT_MS: number;
    readonly MAX_RETRIES: number;
}

export const receiptExtractorEnvSchema = z.object({
    RECEIPT_EXTRACTOR_API_KEY: z.string().optional(),
    RECEIPT_EXTRACTOR_BASE_URL: z.string().optional(),
    RECEIPT_EXTRACTOR_MODEL: z.string().optional(),
    RECEIPT_EXTRACTOR_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    RECEIPT_EXTRACTOR_MAX_RETRIES: z.coerce.number().int().min(0).optional(),
    DASHSCOPE_API_KEY: z.string().optional(),
    DASHSCOPE_BASE_URL: z.string().optional(),
    DASHSCOPE_MODEL: z.string().optional(),
    DASHSCOPE_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
    DASHSCOPE_MAX_RETRIES: z.coerce.number().int().min(0).optional(),
});

export type ReceiptExtractorEnv = z.output<typeof receiptExtractorEnvSchema>;

export const toReceiptExtractorConfig = (env: ReceiptExtractorEnv): ReceiptExtractorConfig => ({
    API_KEY: env.RECEIPT_EXTRACTOR_API_KEY || env.DASHSCOPE_API_KEY || "",
    BASE_URL:
        env.RECEIPT_EXTRACTOR_BASE_URL ||
        env.DASHSCOPE_BASE_URL ||
        "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
    MODEL: env.RECEIPT_EXTRACTOR_MODEL || env.DASHSCOPE_MODEL || "qwen-vl-ocr-2025-11-20",
    TIMEOUT_MS: env.RECEIPT_EXTRACTOR_TIMEOUT_MS ?? env.DASHSCOPE_TIMEOUT_MS ?? 30_000,
    MAX_RETRIES: env.RECEIPT_EXTRACTOR_MAX_RETRIES ?? env.DASHSCOPE_MAX_RETRIES ?? 1,
});

export const loadReceiptExtractorConfig = (env: NodeJS.ProcessEnv = process.env): ReceiptExtractorConfig =>
    toReceiptExtractorConfig(receiptExtractorEnvSchema.parse(env));

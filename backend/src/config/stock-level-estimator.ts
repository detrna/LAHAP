import { z } from "zod";

export interface StockLevelEstimatorConfig {
    readonly API_KEY: string;
    readonly BASE_URL: string;
    readonly MODEL: string;
    readonly TIMEOUT_MS: number;
    readonly MAX_RETRIES: number;
    readonly TOLERANCE: number;
}

export const stockLevelEstimatorEnvSchema = z.object({
    STOCK_ESTIMATOR_API_KEY: z.string().optional(),
    STOCK_ESTIMATOR_BASE_URL: z.string().optional(),
    STOCK_ESTIMATOR_MODEL: z.string().default("qwen3.8-flash"),
    STOCK_ESTIMATOR_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    STOCK_ESTIMATOR_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
    STOCK_ESTIMATOR_TOLERANCE: z.coerce.number().default(0.15),
    DASHSCOPE_API_KEY: z.string().optional(),
    DASHSCOPE_BASE_URL: z.string().optional(),
});

export type StockLevelEstimatorEnv = z.output<typeof stockLevelEstimatorEnvSchema>;

export const toStockLevelEstimatorConfig = (env: StockLevelEstimatorEnv): StockLevelEstimatorConfig => ({
    API_KEY: env.STOCK_ESTIMATOR_API_KEY || env.DASHSCOPE_API_KEY || "",
    BASE_URL:
        env.STOCK_ESTIMATOR_BASE_URL ||
        env.DASHSCOPE_BASE_URL ||
        "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
    MODEL: env.STOCK_ESTIMATOR_MODEL,
    TIMEOUT_MS: env.STOCK_ESTIMATOR_TIMEOUT_MS,
    MAX_RETRIES: env.STOCK_ESTIMATOR_MAX_RETRIES,
    TOLERANCE: env.STOCK_ESTIMATOR_TOLERANCE,
});

export const loadStockLevelEstimatorConfig = (env: NodeJS.ProcessEnv = process.env): StockLevelEstimatorConfig =>
    toStockLevelEstimatorConfig(stockLevelEstimatorEnvSchema.parse(env));

import { describe, expect, it } from "vitest";
import { loadStockLevelEstimatorConfig } from "./stock-level-estimator.js";

describe("loadStockLevelEstimatorConfig", () => {
    it("reads STOCK_ESTIMATOR_* environment variables when provided", () => {
        const config = loadStockLevelEstimatorConfig({
            STOCK_ESTIMATOR_API_KEY: "custom-stock-key",
            STOCK_ESTIMATOR_BASE_URL: "https://custom-stock-url.com",
            STOCK_ESTIMATOR_MODEL: "qwen3.8-flash",
            STOCK_ESTIMATOR_TIMEOUT_MS: "40000",
            STOCK_ESTIMATOR_MAX_RETRIES: "2",
            STOCK_ESTIMATOR_TOLERANCE: "0.2",
        });

        expect(config.API_KEY).toBe("custom-stock-key");
        expect(config.BASE_URL).toBe("https://custom-stock-url.com");
        expect(config.MODEL).toBe("qwen3.8-flash");
        expect(config.TIMEOUT_MS).toBe(40_000);
        expect(config.MAX_RETRIES).toBe(2);
        expect(config.TOLERANCE).toBe(0.2);
    });

    it("falls back to DASHSCOPE_* environment variables if STOCK_ESTIMATOR_API_KEY not specified", () => {
        const config = loadStockLevelEstimatorConfig({
            DASHSCOPE_API_KEY: "dashscope-fallback-key",
            DASHSCOPE_BASE_URL: "https://dashscope-fallback-url.com",
        });

        expect(config.API_KEY).toBe("dashscope-fallback-key");
        expect(config.BASE_URL).toBe("https://dashscope-fallback-url.com");
        expect(config.MODEL).toBe("qwen3.8-flash");
    });

    it("uses default values when env variables are empty", () => {
        const config = loadStockLevelEstimatorConfig({});

        expect(config.API_KEY).toBe("");
        expect(config.BASE_URL).toBe("https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1");
        expect(config.MODEL).toBe("qwen3.8-flash");
        expect(config.TIMEOUT_MS).toBe(30_000);
        expect(config.MAX_RETRIES).toBe(1);
        expect(config.TOLERANCE).toBe(0.15);
    });
});


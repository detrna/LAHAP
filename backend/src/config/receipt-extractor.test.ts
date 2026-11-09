import { describe, expect, it } from "vitest";
import { loadReceiptExtractorConfig } from "./receipt-extractor.js";

describe("loadReceiptExtractorConfig", () => {
    it("reads RECEIPT_EXTRACTOR_* environment variables when provided", () => {
        const config = loadReceiptExtractorConfig({
            RECEIPT_EXTRACTOR_API_KEY: "custom-receipt-key",
            RECEIPT_EXTRACTOR_BASE_URL: "https://custom-url.com",
            RECEIPT_EXTRACTOR_MODEL: "custom-receipt-model",
            RECEIPT_EXTRACTOR_TIMEOUT_MS: "45000",
            RECEIPT_EXTRACTOR_MAX_RETRIES: "3",
        });

        expect(config.API_KEY).toBe("custom-receipt-key");
        expect(config.BASE_URL).toBe("https://custom-url.com");
        expect(config.MODEL).toBe("custom-receipt-model");
        expect(config.TIMEOUT_MS).toBe(45_000);
        expect(config.MAX_RETRIES).toBe(3);
    });

    it("falls back to DASHSCOPE_* environment variables if RECEIPT_EXTRACTOR_* not specified", () => {
        const config = loadReceiptExtractorConfig({
            DASHSCOPE_API_KEY: "dashscope-fallback-key",
            DASHSCOPE_BASE_URL: "https://dashscope-url.com",
            DASHSCOPE_MODEL: "dashscope-fallback-model",
            DASHSCOPE_TIMEOUT_MS: "25000",
            DASHSCOPE_MAX_RETRIES: "2",
        });

        expect(config.API_KEY).toBe("dashscope-fallback-key");
        expect(config.BASE_URL).toBe("https://dashscope-url.com");
        expect(config.MODEL).toBe("dashscope-fallback-model");
        expect(config.TIMEOUT_MS).toBe(25_000);
        expect(config.MAX_RETRIES).toBe(2);
    });

    it("uses default values when no env variables are specified", () => {
        const config = loadReceiptExtractorConfig({});

        expect(config.API_KEY).toBe("");
        expect(config.BASE_URL).toBe("https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1");
        expect(config.MODEL).toBe("qwen3.8-flash");
        expect(config.TIMEOUT_MS).toBe(60_000);
        expect(config.MAX_RETRIES).toBe(1);
    });
});

import { describe, expect, it } from "vitest";
import type { ReceiptExtractorConfig } from "../../config/receipt-extractor.js";
import { AppError } from "../../shared/errors/app-error.js";
import {
    InvalidReceiptImageError,
    ReceiptExtractionError,
} from "../../shared/ports/receipt-extractor/receipt-extractor.js";
import { QwenReceiptExtractor } from "./qwen.js";

const UNITS = ["PCS", "KG", "G", "L", "ML", "PACK", "BUNGKUS", "LUSIN", "BOX", "BUAH"] as const;
const units: [string, ...string[]] = [...UNITS];

const dummyConfig: ReceiptExtractorConfig = {
    API_KEY: "dummy-key-for-unit-tests",
    BASE_URL: "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
    MODEL: "qwen-vl-ocr-2025-11-20",
    TIMEOUT_MS: 30_000,
    MAX_RETRIES: 1,
};

describe("QwenReceiptExtractor (unit)", () => {
    const makeExtractor = () => new QwenReceiptExtractor(dummyConfig);

    it("throws ReceiptExtractionError for unsupported mime type", async () => {
        const extractor = makeExtractor();
        const promise = extractor.extract(Buffer.from("data"), "image/gif", units);

        await expect(promise).rejects.toThrow(ReceiptExtractionError);
        await expect(promise).rejects.toThrow(InvalidReceiptImageError);
        await expect(promise).rejects.toThrow(AppError);
        await promise.catch((err: unknown) => {
            expect(err).toBeInstanceOf(AppError);
            if (err instanceof AppError) {
                expect(err.statusCode).toBe(400);
                expect(err.code).toBe("INVALID_RECEIPT_IMAGE");
            }
        });
    });

    it("throws ReceiptExtractionError for empty image", async () => {
        const extractor = makeExtractor();
        await expect(extractor.extract(Buffer.alloc(0), "image/jpeg", units)).rejects.toThrow(ReceiptExtractionError);
    });

    it("throws ReceiptExtractionError for oversized image", async () => {
        const extractor = makeExtractor();
        await expect(extractor.extract(Buffer.alloc(11 * 1024 * 1024), "image/jpeg", units)).rejects.toThrow(
            ReceiptExtractionError,
        );
    });

    it("throws when API_KEY is missing", () => {
        expect(() => new QwenReceiptExtractor({ ...dummyConfig, API_KEY: "" })).toThrow(
            "DASHSCOPE_API_KEY is not set",
        );
    });
});

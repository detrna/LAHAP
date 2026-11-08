import { describe, expect, it, vi } from "vitest";
import type { ReceiptExtractorConfig } from "../../../config/receipt-extractor.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
    InvalidReceiptImageError,
    LowConfidenceReceiptError,
    NoReceiptItemsFoundError,
    ReceiptExtractionError,
    ReceiptExtractorProviderError,
    type ReceiptIngredientInput,
} from "../../../shared/ports/receipt-extractor/receipt-extractor.js";
import { buildPrompt, QwenReceiptExtractor } from "./qwen.js";

const INGREDIENTS: readonly ReceiptIngredientInput[] = [
    { id: "00000000-0000-4000-8000-000000000001", name: "Dada Ayam Fillet", unit: "kg" },
    { id: "00000000-0000-4000-8000-000000000002", name: "Minyak Zaitun Extra Virgin", unit: "liter" },
    { id: "00000000-0000-4000-8000-000000000003", name: "Gula Pasir", unit: "kg" },
];

const dummyConfig: ReceiptExtractorConfig = {
    API_KEY: "dummy-key-for-unit-tests",
    BASE_URL: "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
    MODEL: "qwen-vl-ocr-2025-11-20",
    TIMEOUT_MS: 30_000,
    MAX_RETRIES: 1,
};

describe("buildPrompt (unit)", () => {
    it("embeds the known ingredients in the prompt", () => {
        const prompt = buildPrompt(INGREDIENTS);

        expect(prompt).toContain("00000000-0000-4000-8000-000000000001");
        expect(prompt).toContain("Dada Ayam Fillet");
        expect(prompt).toContain("Minyak Zaitun Extra Virgin");
    });
});

describe("QwenReceiptExtractor (unit)", () => {
    const makeExtractor = (options = {}) => new QwenReceiptExtractor(dummyConfig, options);

    it("throws InvalidReceiptImageError for unsupported mime type", async () => {
        const extractor = makeExtractor();
        const promise = extractor.extract({
            image: Buffer.from("data"),
            mimeType: "image/gif",
            ingredients: INGREDIENTS,
        });

        await expect(promise).rejects.toThrow(ReceiptExtractionError);
        await expect(promise).rejects.toThrow(InvalidReceiptImageError);
        await expect(promise).rejects.toThrow(AppError);
        await expect(promise).rejects.toThrow("unsupported image type: image/gif");
        await promise.catch((err: unknown) => {
            expect(err).toBeInstanceOf(AppError);
            if (err instanceof AppError) {
                expect(err.statusCode).toBe(400);
                expect(err.code).toBe("INVALID_RECEIPT_IMAGE");
            }
        });
    });

    it("throws InvalidReceiptImageError for empty image", async () => {
        const extractor = makeExtractor();

        await expect(
            extractor.extract({
                image: Buffer.alloc(0),
                mimeType: "image/jpeg",
                ingredients: INGREDIENTS,
            }),
        ).rejects.toThrow("image is empty");
    });

    it("throws InvalidReceiptImageError for oversized image", async () => {
        const extractor = makeExtractor();

        await expect(
            extractor.extract({
                image: Buffer.alloc(11 * 1024 * 1024),
                mimeType: "image/jpeg",
                ingredients: INGREDIENTS,
            }),
        ).rejects.toThrow("image is too large");
    });

    it("throws NoReceiptItemsFoundError when no known ingredients are given", async () => {
        const extractor = makeExtractor();

        await expect(
            extractor.extract({
                image: Buffer.from("data"),
                mimeType: "image/jpeg",
                ingredients: [],
            }),
        ).rejects.toMatchObject({
            constructor: NoReceiptItemsFoundError,
            code: "NO_RECEIPT_ITEMS_FOUND",
            statusCode: 400,
        });
    });

    it("throws when API_KEY is missing", () => {
        expect(() => new QwenReceiptExtractor({ ...dummyConfig, API_KEY: "" })).toThrow("DASHSCOPE_API_KEY is not set");
    });

    it("extracts matched items, normalizes name and unit from known ingredients, and sums duplicate ids", async () => {
        const onUsage = vi.fn();
        const extractor = makeExtractor({ onUsage });
        const client = (extractor as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            confidence: 92,
                            items: [
                                {
                                    id: "00000000-0000-4000-8000-000000000001",
                                    name: "Dada Ayam",
                                    quantity: 10,
                                    unit: "kg",
                                },
                                {
                                    id: "00000000-0000-4000-8000-000000000001",
                                    name: "Dada Ayam Fillet",
                                    quantity: 2.5,
                                    unit: "kg",
                                },
                                {
                                    id: "00000000-0000-4000-8000-000000000002",
                                    name: "Minyak Zaitun",
                                    quantity: "5",
                                    unit: "L",
                                },
                            ],
                        }),
                    },
                },
            ],
            usage: { total_tokens: 120 },
        });

        const result = await extractor.extract({
            image: Buffer.from("receipt-image"),
            mimeType: "image/jpeg",
            ingredients: INGREDIENTS,
        });

        expect(result).toEqual({
            items: [
                {
                    id: "00000000-0000-4000-8000-000000000001",
                    name: "Dada Ayam Fillet",
                    quantity: 12.5,
                    unit: "kg",
                },
                {
                    id: "00000000-0000-4000-8000-000000000002",
                    name: "Minyak Zaitun Extra Virgin",
                    quantity: 5,
                    unit: "liter",
                },
            ],
        });
        expect(onUsage).toHaveBeenCalledWith({ total_tokens: 120 });
    });

    it("drops unknown ingredient ids and stop-word lines, throwing NoReceiptItemsFoundError when none remain", async () => {
        const extractor = makeExtractor();
        const client = (extractor as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            confidence: 95,
                            items: [
                                {
                                    id: "00000000-0000-4000-8000-000000000999",
                                    name: "Kantong Plastik",
                                    quantity: 1,
                                    unit: "kg",
                                },
                                {
                                    id: "00000000-0000-4000-8000-000000000001",
                                    name: "Subtotal",
                                    quantity: 1,
                                    unit: "kg",
                                },
                            ],
                        }),
                    },
                },
            ],
        });

        await expect(
            extractor.extract({
                image: Buffer.from("receipt-image"),
                mimeType: "image/jpeg",
                ingredients: INGREDIENTS,
            }),
        ).rejects.toMatchObject({
            constructor: NoReceiptItemsFoundError,
            code: "NO_RECEIPT_ITEMS_FOUND",
            statusCode: 400,
        });
    });

    it("throws LowConfidenceReceiptError when confidence is below threshold", async () => {
        const extractor = makeExtractor();
        const client = (extractor as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            confidence: 40,
                            items: [
                                {
                                    id: "00000000-0000-4000-8000-000000000001",
                                    name: "Dada Ayam Fillet",
                                    quantity: 10,
                                    unit: "kg",
                                },
                            ],
                        }),
                    },
                },
            ],
        });

        await expect(
            extractor.extract({
                image: Buffer.from("receipt-image"),
                mimeType: "image/jpeg",
                ingredients: INGREDIENTS,
            }),
        ).rejects.toMatchObject({
            constructor: LowConfidenceReceiptError,
            code: "LOW_CONFIDENCE_RECEIPT",
            statusCode: 400,
        });
    });

    it("throws ReceiptExtractorProviderError when the API call fails", async () => {
        const extractor = makeExtractor();
        const client = (extractor as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockRejectedValue(new Error("network failure"));

        await expect(
            extractor.extract({
                image: Buffer.from("receipt-image"),
                mimeType: "image/jpeg",
                ingredients: INGREDIENTS,
            }),
        ).rejects.toMatchObject({
            constructor: ReceiptExtractorProviderError,
            code: "RECEIPT_EXTRACTOR_PROVIDER_ERROR",
            statusCode: 502,
            message: "receipt extractor provider request failed",
        });
    });

    it("throws a 502 ReceiptExtractionError when the output stays invalid after the retry", async () => {
        const extractor = makeExtractor();
        const client = (extractor as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [{ message: { content: "not valid json" } }],
        });

        await expect(
            extractor.extract({
                image: Buffer.from("receipt-image"),
                mimeType: "image/jpeg",
                ingredients: INGREDIENTS,
            }),
        ).rejects.toMatchObject({
            constructor: ReceiptExtractionError,
            code: "RECEIPT_EXTRACTION_FAILED",
            statusCode: 502,
            message: "receipt extractor output was not valid receipt data",
        });
        expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
    });
});

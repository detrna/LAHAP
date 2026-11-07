import { describe, expect, it, vi } from "vitest";
import type { StockLevelEstimatorConfig } from "../../../config/stock-level-estimator.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
    ContainerNotVisibleError,
    LowConfidenceError,
    InvalidStockImageError,
    StockLevelEstimationError,
    StockLevelEstimatorProviderError,
} from "../../../shared/ports/stock-level-estimator/errors.js";
import { buildPrompt, QwenStockLevelEstimator } from "./qwen.js";

const dummyConfig: StockLevelEstimatorConfig = {
    API_KEY: "dummy-key-for-unit-tests",
    BASE_URL: "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
    MODEL: "qwen-vl-ocr-2025-11-20",
    TIMEOUT_MS: 30_000,
    MAX_RETRIES: 1,
    TOLERANCE: 0.15,
};

describe("buildPrompt", () => {
    it("constructs the exact required prompt with ingredient name", () => {
        const prompt = buildPrompt("Minyak Goreng");
        expect(prompt).toBe(
            'This photo shows containers of Minyak Goreng. For each container, estimate how full it is as a number from 0 to 1 (0 = empty, 1 = full). Count only containers of Minyak Goreng. Return only valid JSON, no explanation: {"fills":[1,1,1,0.5],"confidence":"high"}. If you cannot see the liquid level clearly, set confidence to "low".',
        );
    });
});

describe("schema validation (unit)", () => {
    const makeEstimator = () => new QwenStockLevelEstimator(dummyConfig);

    it("rejects fill numbers outside [0, 1] (> 1)", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"fills": [1.5], "confidence": "high"}' } }],
        });

        await expect(
            estimator.estimate({
                image: Buffer.from("fake"),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak", unit: "botol" },
            }),
        ).rejects.toThrow(StockLevelEstimationError);
    });

    it("rejects fill numbers outside [0, 1] (< 0)", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"fills": [-0.5], "confidence": "high"}' } }],
        });

        await expect(
            estimator.estimate({
                image: Buffer.from("fake"),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak", unit: "botol" },
            }),
        ).rejects.toThrow(StockLevelEstimationError);
    });

    it("rejects invalid confidence levels", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [{ message: { content: '{"fills": [1], "confidence": "very_high"}' } }],
        });

        await expect(
            estimator.estimate({
                image: Buffer.from("fake"),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak", unit: "botol" },
            }),
        ).rejects.toThrow(StockLevelEstimationError);
    });
});

describe("QwenStockLevelEstimator (unit)", () => {
    const makeEstimator = (options = {}) => new QwenStockLevelEstimator(dummyConfig, options);

    it("throws InvalidStockImageError for unsupported mime type", async () => {
        const estimator = makeEstimator();
        const promise = estimator.estimate({
            image: Buffer.from("data"),
            mimeType: "image/gif",
            ingredient: { name: "Minyak", unit: "botol" },
        });

        await expect(promise).rejects.toThrow(InvalidStockImageError);
        await expect(promise).rejects.toThrow(StockLevelEstimationError);
        await expect(promise).rejects.toThrow(AppError);
        await expect(promise).rejects.toThrow("unsupported image type: image/gif");
        await promise.catch((err: unknown) => {
            expect(err).toBeInstanceOf(AppError);
            if (err instanceof AppError) {
                expect(err.statusCode).toBe(400);
                expect(err.code).toBe("INVALID_STOCK_IMAGE");
            }
        });
    });

    it("throws InvalidStockImageError for empty image", async () => {
        const estimator = makeEstimator();
        await expect(
            estimator.estimate({
                image: Buffer.alloc(0),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak", unit: "botol" },
            }),
        ).rejects.toThrow("image is empty");
    });

    it("throws InvalidStockImageError for oversized image (> 10MB)", async () => {
        const estimator = makeEstimator();
        await expect(
            estimator.estimate({
                image: Buffer.alloc(11 * 1024 * 1024),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak", unit: "botol" },
            }),
        ).rejects.toThrow(InvalidStockImageError);
    });

    it("throws when API key is missing", () => {
        const originalEnv = process.env["DASHSCOPE_API_KEY"];
        delete process.env["DASHSCOPE_API_KEY"];
        try {
            expect(() => new QwenStockLevelEstimator({ ...dummyConfig, API_KEY: "" })).toThrow(
                "DASHSCOPE_API_KEY is not set",
            );
        } finally {
            if (originalEnv) process.env["DASHSCOPE_API_KEY"] = originalEnv;
        }
    });

    it("estimates stock and returns item with rounded quantity (e.g. 2.5 fills with 0.15 tolerance -> 3 bottles)", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: '```json\n{"fills": [1, 1, 0.5], "confidence": "high"}\n```',
                    },
                },
            ],
            usage: { total_tokens: 150 },
        });

        const result = await estimator.estimate({
            image: Buffer.from("fake-image-bytes"),
            mimeType: "image/jpeg",
            ingredient: { name: "Minyak Goreng", unit: "botol" },
        });

        // total = 2.5, bottles = ceil(2.5 - 0.15) = ceil(2.35) = 3
        expect(result).toEqual({
            item: {
                name: "Minyak Goreng",
                quantity: 3,
                unit: "botol",
            },
        });
    });

    it("rounds 3.0 to 3 bottles and 3.2 to 4 bottles (rounding acceptance criteria)", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;

        // Test 3.0 -> stays 3
        client.chat.completions.create = vi.fn().mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: '{"fills": [1, 1, 1], "confidence": "high"}',
                    },
                },
            ],
        });
        const res30 = await estimator.estimate({
            image: Buffer.from("fake-image"),
            mimeType: "image/jpeg",
            ingredient: { name: "Minyak", unit: "botol" },
        });
        expect(res30.item.quantity).toBe(3);

        // Test 3.2 -> becomes 4
        client.chat.completions.create = vi.fn().mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: '{"fills": [1, 1, 1, 0.2], "confidence": "high"}',
                    },
                },
            ],
        });
        const res32 = await estimator.estimate({
            image: Buffer.from("fake-image"),
            mimeType: "image/jpeg",
            ingredient: { name: "Minyak", unit: "botol" },
        });
        expect(res32.item.quantity).toBe(4);
    });

    it("returns quantity 0 for empty container (empty stays 0)", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: '{"fills": [0], "confidence": "high"}',
                    },
                },
            ],
        });

        const result = await estimator.estimate({
            image: Buffer.from("fake-image"),
            mimeType: "image/jpeg",
            ingredient: { name: "Minyak", unit: "botol" },
        });

        expect(result.item.quantity).toBe(0);
    });

    it("returns quantity 0 when all containers are empty even if model reported low confidence due to absence of liquid level", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: '{"fills": [0, 0, 0], "confidence": "low"}',
                    },
                },
            ],
        });

        const result = await estimator.estimate({
            image: Buffer.from("fake-image"),
            mimeType: "image/jpeg",
            ingredient: { name: "Cooking Oil", unit: "bottle" },
        });

        expect(result.item.quantity).toBe(0);
    });

    it("defaults confidence to high if omitted in response", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: '{"fills": [1, 1]}',
                    },
                },
            ],
        });

        const result = await estimator.estimate({
            image: Buffer.from("fake-image"),
            mimeType: "image/jpeg",
            ingredient: { name: "Cooking Oil", unit: "bottle" },
        });

        expect(result.item.quantity).toBe(2);
    });

    it("throws ContainerNotVisibleError when fills array is empty", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: '{"fills": [], "confidence": "high"}',
                    },
                },
            ],
        });

        await expect(
            estimator.estimate({
                image: Buffer.from("fake-image-bytes"),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak Goreng", unit: "botol" },
            }),
        ).rejects.toMatchObject({
            constructor: ContainerNotVisibleError,
            code: "CONTAINER_NOT_VISIBLE",
            statusCode: 400,
            message: "no containers of 'Minyak Goreng' visible in image",
        });
    });

    it("throws LowConfidenceError when model returns low confidence (handled internally in infrastructure)", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [
                {
                    message: {
                        content: '{"fills": [0.5], "confidence": "low"}',
                    },
                },
            ],
        });

        await expect(
            estimator.estimate({
                image: Buffer.from("fake-image-bytes"),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak Goreng", unit: "botol" },
            }),
        ).rejects.toMatchObject({ constructor: LowConfidenceError, code: "LOW_CONFIDENCE", statusCode: 400 });
    });

    it("throws StockLevelEstimatorProviderError when API call fails", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockRejectedValue(new Error("Network timeout"));

        await expect(
            estimator.estimate({
                image: Buffer.from("fake-image-bytes"),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak Goreng", unit: "botol" },
            }),
        ).rejects.toMatchObject({
            constructor: StockLevelEstimatorProviderError,
            code: "STOCK_LEVEL_ESTIMATOR_PROVIDER_ERROR",
            statusCode: 502,
            message: "stock level estimator provider request failed",
        });
    });

    it("throws a 502 StockLevelEstimationError when the output stays invalid after the retry", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({
            choices: [{ message: { content: "invalid json string" } }],
        });

        await expect(
            estimator.estimate({
                image: Buffer.from("fake-image-bytes"),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak Goreng", unit: "botol" },
            }),
        ).rejects.toMatchObject({
            constructor: StockLevelEstimationError,
            code: "STOCK_LEVEL_ESTIMATION_FAILED",
            statusCode: 502,
        });
    });

    it("throws a provider error when the provider returns no content", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi.fn().mockResolvedValue({ choices: [{ message: { content: "" } }] });

        await expect(
            estimator.estimate({
                image: Buffer.from("fake-image-bytes"),
                mimeType: "image/jpeg",
                ingredient: { name: "Minyak Goreng", unit: "botol" },
            }),
        ).rejects.toMatchObject({ code: "STOCK_LEVEL_ESTIMATOR_PROVIDER_ERROR", statusCode: 502 });
    });

    it("retries once when output is malformed JSON and succeeds on second attempt", async () => {
        const estimator = makeEstimator();
        const client = (estimator as unknown as { client: { chat: { completions: { create: unknown } } } }).client;
        client.chat.completions.create = vi
            .fn()
            .mockResolvedValueOnce({
                choices: [{ message: { content: "invalid json string" } }],
            })
            .mockResolvedValueOnce({
                choices: [{ message: { content: '{"fills": [1], "confidence": "medium"}' } }],
            });

        const result = await estimator.estimate({
            image: Buffer.from("fake-image-bytes"),
            mimeType: "image/jpeg",
            ingredient: { name: "Minyak Goreng", unit: "botol" },
        });

        expect(client.chat.completions.create).toHaveBeenCalledTimes(2);
        expect(result.item.quantity).toBe(1);
    });
});

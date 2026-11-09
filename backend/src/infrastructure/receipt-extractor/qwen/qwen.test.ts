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
    MODEL: "qwen3.8-flash",
    TIMEOUT_MS: 30_000,
    MAX_RETRIES: 1,
};

const [AYAM, MINYAK, GULA] = INGREDIENTS.map(ingredient => ingredient.id);

describe("buildPrompt (unit)", () => {
    it("lists the known ingredients and asks for the printed quantity and unit without converting", () => {
        const prompt = buildPrompt(INGREDIENTS);

        for (const ingredient of INGREDIENTS) {
            expect(prompt).toContain(ingredient.id);
            expect(prompt).toContain(ingredient.name);
        }
        expect(prompt).toContain("Do not convert units");
        expect(prompt).toContain("confidence");
    });
});

describe("QwenReceiptExtractor (unit)", () => {
    const makeExtractor = (options = {}) => new QwenReceiptExtractor(dummyConfig, options);
    const mockCompletion = (extractor: QwenReceiptExtractor, output: unknown, usage?: unknown) => {
        const create = vi.fn().mockResolvedValue({
            choices: [{ message: { content: typeof output === "string" ? output : JSON.stringify(output) } }],
            usage,
        });
        (
            extractor as unknown as { client: { chat: { completions: { create: unknown } } } }
        ).client.chat.completions.create = create;
        return create;
    };
    const extractFrom = (extractor: QwenReceiptExtractor) =>
        extractor.extract({ image: Buffer.from("receipt-image"), mimeType: "image/jpeg", ingredients: INGREDIENTS });

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

    it("returns each matched line with the quantity and unit printed on the receipt", async () => {
        const onUsage = vi.fn();
        const extractor = makeExtractor({ onUsage });
        const create = mockCompletion(
            extractor,
            {
                confidence: 92,
                items: [
                    { id: AYAM, quantity: 10, unit: "kg" },
                    { id: AYAM, quantity: 500, unit: "gr" },
                    { id: MINYAK, quantity: "1,5", unit: "L" },
                    { id: GULA, quantity: 2, unit: null },
                    { id: GULA, quantity: 1 },
                ],
            },
            { total_tokens: 120 },
        );

        const result = await extractFrom(extractor);

        expect(result).toEqual({
            items: [
                { id: AYAM, quantity: 10, printedUnit: "kg" },
                { id: AYAM, quantity: 500, printedUnit: "gr" },
                { id: MINYAK, quantity: 1.5, printedUnit: "L" },
                { id: GULA, quantity: 2, printedUnit: "" },
                { id: GULA, quantity: 1, printedUnit: "" },
            ],
        });
        expect(create).toHaveBeenCalledOnce();
        expect(onUsage).toHaveBeenCalledWith({ total_tokens: 120 });
    });

    it("drops invalid lines and unknown ids without failing the receipt or calling the model again", async () => {
        const extractor = makeExtractor();
        const create = mockCompletion(extractor, {
            confidence: 90,
            items: [
                { id: AYAM, quantity: 2, unit: "kg" },
                { id: "00000000-0000-4000-8000-000000000999", quantity: 1, unit: "kg" },
                { id: MINYAK, quantity: 0, unit: "L" },
                { id: MINYAK, quantity: null, unit: "L" },
                { id: GULA, quantity: "2 x 500g", unit: "gr" },
                { name: "Subtotal", quantity: 1 },
                "Kantong Plastik",
            ],
        });

        const result = await extractFrom(extractor);

        expect(result).toEqual({ items: [{ id: AYAM, quantity: 2, printedUnit: "kg" }] });
        expect(create).toHaveBeenCalledOnce();
    });

    it("throws NoReceiptItemsFoundError when no valid line matches a known ingredient", async () => {
        const extractor = makeExtractor();
        mockCompletion(extractor, {
            confidence: 95,
            items: [
                { id: "00000000-0000-4000-8000-000000000999", quantity: 1, unit: "pcs" },
                { id: AYAM, quantity: -1, unit: "kg" },
            ],
        });

        await expect(extractFrom(extractor)).rejects.toMatchObject({
            constructor: NoReceiptItemsFoundError,
            code: "NO_RECEIPT_ITEMS_FOUND",
            statusCode: 400,
        });
    });

    it("throws LowConfidenceReceiptError when confidence is below threshold", async () => {
        const extractor = makeExtractor();
        mockCompletion(extractor, { confidence: 40, items: [{ id: AYAM, quantity: 10, unit: "kg" }] });

        await expect(extractFrom(extractor)).rejects.toMatchObject({
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

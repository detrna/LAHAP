import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../config/index.js";
import { ReceiptExtractionError } from "../../shared/ports/receipt-extractor/receipt-extractor.js";
import { QwenReceiptExtractor } from "./qwen.js";

const config = loadConfig();

// Integration tests call the real (paid) OCR API.
// Run with: npm run test:integration
if (!config.RECEIPT_EXTRACTOR.API_KEY) {
    throw new Error("DASHSCOPE_API_KEY is required to run integration tests");
}

const FIXTURES_DIR = join(import.meta.dirname, "fixtures");
const UNITS = ["PCS", "KG", "G", "L", "ML", "PACK", "BUNGKUS", "LUSIN", "BOX", "BUAH"] as const;
const units: [string, ...string[]] = [...UNITS];

const TIMEOUT_MS = 30_000;

const makeExtractor = () =>
    new QwenReceiptExtractor(config.RECEIPT_EXTRACTOR, {
        onUsage: usage => console.log("[token usage]", usage),
    });

async function loadFixture(name: string) {
    const mimeType = name.endsWith(".png") ? "image/png" : "image/jpeg";
    return { image: await readFile(join(FIXTURES_DIR, name)), mimeType };
}

describe("QwenReceiptExtractor (integration)", () => {
    // Happy path — clear readable receipts
    it.each(["receipt.jpg", "clean_receipt.png"])(
        "extracts valid items from %s",
        async name => {
            const { image, mimeType } = await loadFixture(name);

            const result = await makeExtractor().extract(image, mimeType, units);

            expect(result.items.length).toBeGreaterThan(0);
            for (const item of result.items) {
                expect(item.name.length).toBeGreaterThan(0);
                expect(Number.isFinite(item.quantity)).toBe(true);
                expect(item.quantity).toBeGreaterThan(0);
                expect(UNITS).toContain(item.unit);
            }
            // console.log(`[${name}]`, JSON.stringify(result, null, 2));
        },
        TIMEOUT_MS,
    );

    // Failure path — blurry image should be rejected by the confidence gate
    it(
        "throws ReceiptExtractionError for blurry_receipt.jpg (low confidence)",
        async () => {
            const { image, mimeType } = await loadFixture("blurry_receipt.jpg");

            await expect(makeExtractor().extract(image, mimeType, units)).rejects.toThrow(ReceiptExtractionError);
        },
        TIMEOUT_MS,
    );

    // Failure path — non-receipt image should be rejected by the confidence gate
    it(
        "throws ReceiptExtractionError for not_a_receipt.jpg (low confidence)",
        async () => {
            const { image, mimeType } = await loadFixture("not_a_receipt.jpg");

            await expect(makeExtractor().extract(image, mimeType, units)).rejects.toThrow(ReceiptExtractionError);
        },
        TIMEOUT_MS,
    );
});

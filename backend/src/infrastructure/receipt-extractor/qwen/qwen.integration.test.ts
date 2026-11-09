import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import {
    ReceiptExtractionError,
    type ReceiptIngredientInput,
} from "../../../shared/ports/receipt-extractor/receipt-extractor.js";
import { QwenReceiptExtractor } from "./qwen.js";

const config = loadConfig();

const FIXTURES_DIR = join(import.meta.dirname, "fixtures");
const INGREDIENTS: readonly ReceiptIngredientInput[] = [
    { id: "00000000-0000-4000-8000-000000000001", name: "Dada Ayam Fillet", unit: "kg" },
    { id: "00000000-0000-4000-8000-000000000002", name: "Beras Basmati", unit: "kg" },
    { id: "00000000-0000-4000-8000-000000000003", name: "Minyak Zaitun Extra Virgin", unit: "liter" },
    { id: "00000000-0000-4000-8000-000000000004", name: "Tomat Segar", unit: "kg" },
    { id: "00000000-0000-4000-8000-000000000005", name: "Bawang Bombai", unit: "kg" },
    { id: "00000000-0000-4000-8000-000000000006", name: "Gula Pasir", unit: "kg" },
];
const INGREDIENT_IDS = new Set(INGREDIENTS.map(ingredient => ingredient.id));

const TIMEOUT_MS = 120_000;

const makeExtractor = () =>
    new QwenReceiptExtractor(config.RECEIPT_EXTRACTOR, {
        onUsage: usage => console.log("[token usage]", usage),
    });

async function loadFixture(name: string) {
    const mimeType = name.endsWith(".png") ? "image/png" : "image/jpeg";
    return { image: await readFile(join(FIXTURES_DIR, name)), mimeType };
}

describe.skipIf(!config.RECEIPT_EXTRACTOR.API_KEY)("QwenReceiptExtractor (integration)", () => {
    it.each(["receipt.jpg", "clean_receipt.png"])(
        "extracts valid matched items from %s",
        async name => {
            const { image, mimeType } = await loadFixture(name);

            const result = await makeExtractor().extract({ image, mimeType, ingredients: INGREDIENTS });

            expect(result.items.length).toBeGreaterThan(0);
            for (const item of result.items) {
                expect(INGREDIENT_IDS.has(item.id)).toBe(true);
                expect(typeof item.printedUnit).toBe("string");
                expect(Number.isFinite(item.quantity)).toBe(true);
                expect(item.quantity).toBeGreaterThan(0);
            }
        },
        TIMEOUT_MS,
    );

    it(
        "throws ReceiptExtractionError for blurry_receipt.jpg (low confidence)",
        async () => {
            const { image, mimeType } = await loadFixture("blurry_receipt.jpg");

            await expect(makeExtractor().extract({ image, mimeType, ingredients: INGREDIENTS })).rejects.toThrow(
                ReceiptExtractionError,
            );
        },
        TIMEOUT_MS,
    );

    it(
        "throws ReceiptExtractionError for not_a_receipt.jpg (low confidence)",
        async () => {
            const { image, mimeType } = await loadFixture("not_a_receipt.jpg");

            await expect(makeExtractor().extract({ image, mimeType, ingredients: INGREDIENTS })).rejects.toThrow(
                ReceiptExtractionError,
            );
        },
        TIMEOUT_MS,
    );
});

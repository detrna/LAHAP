import "dotenv/config";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../../config/index.js";
import {
    InvalidStockImageError,
    type StockLevelEstimateOutput,
} from "../../../shared/ports/stock-level-estimator/stock-level-estimator.js";
import { QwenStockLevelEstimator } from "./qwen.js";

const config = loadConfig();

// Integration tests call the real DashScope vision API.
// Run with: npm run test:integration
if (!config.STOCK_LEVEL_ESTIMATOR.API_KEY) {
    throw new Error("STOCK_ESTIMATOR_API_KEY is required to run integration tests");
}

const FIXTURES_DIR = join(import.meta.dirname, "fixtures");
const TIMEOUT_MS = 60_000;

const makeEstimator = () =>
    new QwenStockLevelEstimator(
        {
            ...config.STOCK_LEVEL_ESTIMATOR,
            MODEL: config.STOCK_LEVEL_ESTIMATOR.MODEL === "qwen-vl-ocr" ? "qwen3.6-flash" : config.STOCK_LEVEL_ESTIMATOR.MODEL,
            TIMEOUT_MS: Math.max(config.STOCK_LEVEL_ESTIMATOR.TIMEOUT_MS, 60_000),
        },
        {
            onUsage: usage => console.log("[token usage]", usage),
        },
    );

async function loadFixtureImage(relativePath: string) {
    const filePath = join(FIXTURES_DIR, relativePath);
    const mimeType = relativePath.endsWith(".png") ? "image/png" : "image/jpeg";
    const image = await readFile(filePath);
    return { image, mimeType };
}

describe("QwenStockLevelEstimator (integration)", () => {
    // Multi-bottle scene: 5 full bottles of cooking oil
    it(
        "estimates stock for oil_scene_01_5bottles.png (start of day: 5 bottles)",
        async () => {
            const { image, mimeType } = await loadFixtureImage("scenes/oil_scene_01_5bottles.png");

            const result: StockLevelEstimateOutput = await makeEstimator().estimate({
                image,
                mimeType,
                ingredient: {
                    name: "Cooking Oil",
                    unit: "bottle",
                },
            });

            expect(result.item.name).toBe("Cooking Oil");
            expect(result.item.unit).toBe("bottle");
            expect(Number.isInteger(result.item.quantity)).toBe(true);
            expect(result.item.quantity).toBeGreaterThanOrEqual(4);
            expect(result.item.quantity).toBeLessThanOrEqual(6);
        },
        TIMEOUT_MS,
    );

    // Multi-bottle scene: 3 full + 1 half bottle of cooking oil (rounds up to 4)
    it(
        "estimates stock for oil_scene_3full_1half.png (end of day: 3.5 -> 4 bottles)",
        async () => {
            const { image, mimeType } = await loadFixtureImage("scenes/oil_scene_3full_1half.png");

            const result = await makeEstimator().estimate({
                image,
                mimeType,
                ingredient: {
                    name: "Cooking Oil",
                    unit: "bottle",
                },
            });

            expect(result.item.name).toBe("Cooking Oil");
            expect(result.item.unit).toBe("bottle");
            expect(Number.isInteger(result.item.quantity)).toBe(true);
            expect(result.item.quantity).toBeGreaterThanOrEqual(3);
            expect(result.item.quantity).toBeLessThanOrEqual(5);
        },
        TIMEOUT_MS,
    );

    // Multi-bottle scene: Drinking water
    it(
        "estimates stock for water_scene_01_5bottles.png (5 water bottles)",
        async () => {
            const { image, mimeType } = await loadFixtureImage("scenes/water_scene_01_5bottles.png");

            const result = await makeEstimator().estimate({
                image,
                mimeType,
                ingredient: {
                    name: "Drinking Water",
                    unit: "bottle",
                },
            });

            expect(result.item.name).toBe("Drinking Water");
            expect(result.item.unit).toBe("bottle");
            expect(Number.isInteger(result.item.quantity)).toBe(true);
            expect(result.item.quantity).toBeGreaterThanOrEqual(4);
            expect(result.item.quantity).toBeLessThanOrEqual(6);
        },
        TIMEOUT_MS,
    );

    // Single bottle reference: 100% full single oil bottle
    it(
        "estimates 1 bottle for reference_singles/oil_single_100.png",
        async () => {
            const { image, mimeType } = await loadFixtureImage("reference_singles/oil_single_100.png");

            const result = await makeEstimator().estimate({
                image,
                mimeType,
                ingredient: {
                    name: "Cooking Oil",
                    unit: "bottle",
                },
            });

            expect(result.item.quantity).toBe(1);
        },
        TIMEOUT_MS,
    );

    // Validation / failure path: empty image buffer rejected before network call
    it("throws InvalidStockImageError for empty image", async () => {
        await expect(
            makeEstimator().estimate({
                image: Buffer.alloc(0),
                mimeType: "image/png",
                ingredient: { name: "Cooking Oil", unit: "bottle" },
            }),
        ).rejects.toThrow(InvalidStockImageError);
    });

    // Validation / failure path: unsupported mime type rejected before network call
    it("throws InvalidStockImageError for unsupported mime type", async () => {
        await expect(
            makeEstimator().estimate({
                image: Buffer.from("fake-bytes"),
                mimeType: "image/gif",
                ingredient: { name: "Cooking Oil", unit: "bottle" },
            }),
        ).rejects.toThrow(InvalidStockImageError);
    });
});


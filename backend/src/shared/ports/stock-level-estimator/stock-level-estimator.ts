import type { Buffer } from "node:buffer";

export * from "./errors.js";

export interface StockLevelIngredientInput {
    name: string;
    unit: string;
    containerCapacity?: number | undefined;
}

export interface StockLevelEstimateInput {
    image: Buffer;
    mimeType: string;
    ingredient: StockLevelIngredientInput;
}

export interface StockLevelEstimateOutput {
    item: { name: string; quantity: number; unit: string };
}

export interface StockLevelEstimator {
    estimate(input: StockLevelEstimateInput): Promise<StockLevelEstimateOutput>;
}

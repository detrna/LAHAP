import type { Buffer } from "node:buffer";

export * from "./errors.js";

export interface ReceiptIngredientInput {
    readonly id: string;
    readonly name: string;
    readonly unit: string;
}

export interface ReceiptExtractInput {
    readonly image: Buffer;
    readonly mimeType: string;
    readonly ingredients: readonly ReceiptIngredientInput[];
}

export interface ReceiptExtractedItem {
    readonly id: string;
    readonly quantity: number;
    readonly printedUnit: string;
}

export interface ReceiptData {
    readonly items: readonly ReceiptExtractedItem[];
}

export interface ReceiptExtractor {
    extract(input: ReceiptExtractInput): Promise<ReceiptData>;
}

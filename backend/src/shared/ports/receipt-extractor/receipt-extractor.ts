import type { Buffer } from "node:buffer";

export * from "./errors.js";

export interface ReceiptData {
    items: { name: string; quantity: number; unit: string }[];
}

export interface ReceiptExtractor {
    extract(image: Buffer, mimeType: string, units: [string, ...string[]]): Promise<ReceiptData>;
}

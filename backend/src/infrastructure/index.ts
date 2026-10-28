import type { Config } from "../config/index.js";
import type { ReceiptExtractor } from "../shared/ports/receipt-extractor/receipt-extractor.js";
import { QwenReceiptExtractor } from "./receipt-extractor/qwen.js";

export interface Infrastructure {
    readonly receiptExtractor: ReceiptExtractor;
}

export async function createInfrastructure(config: Config): Promise<Infrastructure> {
    return {
        receiptExtractor: new QwenReceiptExtractor(config.RECEIPT_EXTRACTOR),
    };
}

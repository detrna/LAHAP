import type { Config } from "../config/index.js";
import type { ObjectStorage } from "../shared/ports/object-storage/object-storage.js";
import type { ReceiptExtractor } from "../shared/ports/receipt-extractor/receipt-extractor.js";
import { loadObjectStorage } from "./object-storage/seaweedfs.js";
import { QwenReceiptExtractor } from "./receipt-extractor/qwen.js";

export interface Infrastructure {
    readonly receiptExtractor: ReceiptExtractor;
    readonly objectStorage: ObjectStorage;
}

export async function createInfrastructure(config: Config): Promise<Infrastructure> {
    const objectStorage = await loadObjectStorage(config.OBJECT_STORAGE, {
        autoCreateBucket: !config.APP.IS_PRODUCTION,
    });

    return {
        receiptExtractor: new QwenReceiptExtractor(config.RECEIPT_EXTRACTOR),
        objectStorage,
    };
}

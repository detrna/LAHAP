import type { Config } from "../config/index.js";
import type { Hasher } from "../shared/ports/hasher/hasher.js";
import type { ObjectStorage } from "../shared/ports/object-storage/object-storage.js";
import type { ReceiptExtractor } from "../shared/ports/receipt-extractor/receipt-extractor.js";
import type { TokenProvider } from "../shared/ports/token-provider/token-provider.js";
import { BcryptHasher } from "./hasher/bcrypt/bcrypt.js";
import { loadObjectStorage } from "./object-storage/seaweedfs/seaweedfs.js";
import { QwenReceiptExtractor } from "./receipt-extractor/qwen/qwen.js";
import { JwtTokenProvider } from "./token-provider/jwt/jwt.js";

export interface Infrastructure {
    readonly hasher: Hasher;
    readonly tokenProvider: TokenProvider;
    readonly receiptExtractor: ReceiptExtractor;
    readonly objectStorage: ObjectStorage;
}

export async function createInfrastructure(config: Config): Promise<Infrastructure> {
    const objectStorage = await loadObjectStorage(config.OBJECT_STORAGE, {
        autoCreateBucket: !config.APP.IS_PRODUCTION,
    });

    return {
        hasher: new BcryptHasher(config.HASHER),
        tokenProvider: new JwtTokenProvider(config.JWT),
        receiptExtractor: new QwenReceiptExtractor(config.RECEIPT_EXTRACTOR),
        objectStorage,
    };
}

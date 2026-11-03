import type { Config } from "../config/index.js";
import type { Cache } from "../shared/ports/cache/cache.js";
import type { Hasher } from "../shared/ports/hasher/hasher.js";
import type { Logger } from "../shared/ports/logger/logger.js";
import type { ObjectStorage } from "../shared/ports/object-storage/object-storage.js";
import type { PaymentGateway } from "../shared/ports/payment-gateway/payment-gateway.js";
import type { ReceiptExtractor } from "../shared/ports/receipt-extractor/receipt-extractor.js";
import type { StockLevelEstimator } from "../shared/ports/stock-level-estimator/stock-level-estimator.js";
import type { TokenProvider } from "../shared/ports/token-provider/token-provider.js";
import { loadRedisCache } from "./cache/redis/redis.js";
import { BcryptHasher } from "./hasher/bcrypt/bcrypt.js";
import { PinoLogger } from "./logger/pino/pino.js";
import { loadObjectStorage } from "./object-storage/seaweedfs/seaweedfs.js";
import { MidtransPaymentGateway } from "./payment-gateway/midtrans/midtrans.js";
import { QwenReceiptExtractor } from "./receipt-extractor/qwen/qwen.js";
import { QwenStockLevelEstimator } from "./stock-level-estimator/qwen/qwen.js";
import { JwtTokenProvider } from "./token-provider/jwt/jwt.js";

/** Adapter instances typed by their ports. Built once at boot and handed to module containers. */
export interface Adapters {
    readonly logger: Logger;
    readonly cache: Cache;
    readonly hasher: Hasher;
    readonly tokenProvider: TokenProvider;
    readonly receiptExtractor: ReceiptExtractor;
    readonly stockLevelEstimator: StockLevelEstimator;
    readonly objectStorage: ObjectStorage;
    readonly paymentGateway: PaymentGateway;
}

export async function createAdapters(config: Config): Promise<Adapters> {
    const [cache, objectStorage] = await Promise.all([
        loadRedisCache(config.REDIS),
        loadObjectStorage(config.OBJECT_STORAGE, {
            autoCreateBucket: !config.APP.IS_PRODUCTION,
        }),
    ]);

    return {
        logger: new PinoLogger(config.LOGGER),
        hasher: new BcryptHasher(config.HASHER),
        tokenProvider: new JwtTokenProvider(config.JWT),
        receiptExtractor: new QwenReceiptExtractor(config.RECEIPT_EXTRACTOR),
        stockLevelEstimator: new QwenStockLevelEstimator(config.STOCK_LEVEL_ESTIMATOR),
        paymentGateway: new MidtransPaymentGateway(config.PAYMENT_GATEWAY, config.APP),
        objectStorage,
        cache,
    };
}

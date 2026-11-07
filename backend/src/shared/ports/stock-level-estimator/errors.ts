import { AppError } from "../../errors/app-error.js";

export class StockLevelEstimationError extends AppError {
    readonly code: string = "STOCK_LEVEL_ESTIMATION_FAILED";
    readonly statusCode: number = 502;
}

export class InvalidStockImageError extends StockLevelEstimationError {
    override readonly code = "INVALID_STOCK_IMAGE";
    override readonly statusCode = 400;
}

export class LowConfidenceError extends StockLevelEstimationError {
    override readonly code = "LOW_CONFIDENCE";
    override readonly statusCode = 400;
}

export class ContainerNotVisibleError extends StockLevelEstimationError {
    override readonly code = "CONTAINER_NOT_VISIBLE";
    override readonly statusCode = 400;
}

export class StockLevelEstimatorProviderError extends StockLevelEstimationError {
    override readonly code = "STOCK_LEVEL_ESTIMATOR_PROVIDER_ERROR";
    override readonly statusCode = 502;
}

import { AppError } from "../../errors/app-error.js";

export class StockLevelEstimationError extends AppError {
    readonly code: string = "STOCK_LEVEL_ESTIMATION_FAILED";
    readonly statusCode: number = 400;

    constructor(
        message: string,
        options?: { cause?: unknown; code?: string; statusCode?: number },
    ) {
        super(message, { cause: options?.cause });
        if (options?.code) this.code = options.code;
        if (options?.statusCode) this.statusCode = options.statusCode;
    }
}

export class InvalidStockImageError extends StockLevelEstimationError {
    override readonly code = "INVALID_STOCK_IMAGE";
    override readonly statusCode = 400;
}

export class ErrorLowConfidence extends StockLevelEstimationError {
    override readonly code = "LOW_CONFIDENCE";
    override readonly statusCode = 400;
}

export class ErrorContainerNotVisible extends StockLevelEstimationError {
    override readonly code = "CONTAINER_NOT_VISIBLE";
    override readonly statusCode = 400;
}

export class ErrorIngredientNotFound extends AppError {
    override readonly code = "INGREDIENT_NOT_FOUND";
    override readonly statusCode = 404;

    constructor(ingredientId: string, options?: { cause?: unknown }) {
        super(`Ingredient with ID '${ingredientId}' not found`, { cause: options?.cause });
    }
}

export class StockLevelEstimatorProviderError extends StockLevelEstimationError {
    override readonly code = "STOCK_LEVEL_ESTIMATOR_PROVIDER_ERROR";
    override readonly statusCode = 502;
}

// Alias for backwards compatibility if needed
export { ErrorLowConfidence as LowConfidenceError };

import { AppError } from "../../../shared/errors/app-error.js";

export class PromoCodesRepositoryFailureError extends AppError {
    readonly code = "PROMO_CODES_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`promo codes repository operation failed: ${operation}`, { cause });
    }
}

export class PromoCodeNotFoundError extends AppError {
    readonly code = "PROMO_CODE_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly promoCodeId: string) {
        super(`promo code not found: "${promoCodeId}"`);
    }
}

export class PromoCodeAlreadyExistsError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(options?: { cause?: unknown }) {
        super("promo code is already used", options);
    }
}

export class PromoCodeInUseError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(public readonly promoCodeId: string) {
        super("promo code is used by orders that are waiting for payment");
    }
}

export class PromoCodeGenerationError extends AppError {
    readonly code = "PROMO_CODE_GENERATION_FAILED";
    readonly statusCode = 500;

    constructor(public readonly attempts: number) {
        super(`could not generate a unique promo code after ${attempts} attempts`);
    }
}

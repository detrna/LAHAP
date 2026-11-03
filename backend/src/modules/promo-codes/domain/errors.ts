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

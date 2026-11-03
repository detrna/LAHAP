import { AppError } from "../../../shared/errors/app-error.js";

export class IngredientsRepositoryFailureError extends AppError {
    readonly code = "INGREDIENTS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`ingredients repository operation failed: ${operation}`, { cause });
    }
}

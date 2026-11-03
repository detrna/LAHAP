import { AppError } from "../../../shared/errors/app-error.js";

export class KitchenRepositoryFailureError extends AppError {
    readonly code = "KITCHEN_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`kitchen repository operation failed: ${operation}`, { cause });
    }
}

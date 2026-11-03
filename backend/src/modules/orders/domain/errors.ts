import { AppError } from "../../../shared/errors/app-error.js";

export class OrdersRepositoryFailureError extends AppError {
    readonly code = "ORDERS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`orders repository operation failed: ${operation}`, { cause });
    }
}

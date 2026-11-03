import { AppError } from "../../../shared/errors/app-error.js";

export class DeliveryRepositoryFailureError extends AppError {
    readonly code = "DELIVERY_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`delivery repository operation failed: ${operation}`, { cause });
    }
}

import { AppError } from "../../../shared/errors/app-error.js";

export class RetentionRepositoryFailureError extends AppError {
    readonly code = "RETENTION_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`retention repository operation failed: ${operation}`, { cause });
    }
}

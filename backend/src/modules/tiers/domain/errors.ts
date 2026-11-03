import { AppError } from "../../../shared/errors/app-error.js";

export class TiersRepositoryFailureError extends AppError {
    readonly code = "TIERS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`tiers repository operation failed: ${operation}`, { cause });
    }
}

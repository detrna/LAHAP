import { AppError } from "../../../shared/errors/app-error.js";

export class CatalogRepositoryFailureError extends AppError {
    readonly code = "CATALOG_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`catalog repository operation failed: ${operation}`, { cause });
    }
}

import { AppError } from "../../errors/app-error.js";

export class InvalidObjectKeyError extends AppError {
    readonly code = "INVALID_OBJECT_KEY";
    readonly statusCode = 400;

    constructor(
        public readonly key: string,
        reason = "invalid object key",
    ) {
        super(`${reason}: "${key}"`);
    }
}

export class ObjectNotFoundError extends AppError {
    readonly code = "OBJECT_NOT_FOUND";
    readonly statusCode = 404;

    constructor(
        public readonly key: string,
        options?: { cause?: unknown },
    ) {
        super(`object not found: ${key}`, options);
    }
}

export class StorageFailureError extends AppError {
    readonly code = "STORAGE_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`storage operation failed: ${operation}`, { cause });
    }
}

import { AppError } from "../../errors/app-error.js";

export class InvalidCacheKeyError extends AppError {
    readonly code = "INVALID_CACHE_KEY";
    readonly statusCode = 400;

    constructor(
        public readonly key: string,
        reason = "invalid cache key",
    ) {
        super(`${reason}: "${key}"`);
    }
}

export class InvalidCacheTtlError extends AppError {
    readonly code = "INVALID_CACHE_TTL";
    readonly statusCode = 400;

    constructor(
        public readonly ttlSeconds: number,
        reason = "cache TTL must be a positive integer",
    ) {
        super(`${reason}: ${ttlSeconds}`);
    }
}

export class CacheFailureError extends AppError {
    readonly code = "CACHE_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`cache operation failed: ${operation}`, { cause });
    }
}


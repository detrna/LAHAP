import { AppError } from "../../errors/app-error.js";

export class InvalidHashInputError extends AppError {
    readonly code = "INVALID_HASH_INPUT";
    readonly statusCode = 400;

    constructor(reason = "invalid hash input") {
        super(reason);
    }
}

export class HashingFailureError extends AppError {
    readonly code = "HASHING_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: "hash" | "compare",
        cause?: unknown,
    ) {
        super(`hashing operation failed: ${operation}`, { cause });
    }
}


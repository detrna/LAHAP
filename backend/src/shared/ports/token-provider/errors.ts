import { AppError } from "../../errors/app-error.js";

export class InvalidTokenPayloadError extends AppError {
    readonly code = "INVALID_TOKEN_PAYLOAD";
    readonly statusCode = 400;

    constructor(reason = "invalid token payload") {
        super(reason);
    }
}

export class InvalidTokenError extends AppError {
    readonly code: string = "INVALID_TOKEN";
    readonly statusCode: number = 401;

    constructor(reason = "invalid token", options?: { cause?: unknown }) {
        super(reason, options);
    }
}

export class TokenExpiredError extends InvalidTokenError {
    override readonly code = "TOKEN_EXPIRED";
    override readonly statusCode = 401;

    constructor(reason = "token has expired", options?: { cause?: unknown }) {
        super(reason, options);
    }
}

export class TokenProviderFailureError extends AppError {
    readonly code = "TOKEN_PROVIDER_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`token provider operation failed: ${operation}`, { cause });
    }
}


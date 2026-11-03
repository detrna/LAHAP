import { AppError } from "../../shared/errors/app-error.js";
import type { RequestValidationTarget, ValidationIssue } from "../../shared/response/index.js";

export * from "../../shared/ports/token-provider/errors.js";
export type { RequestValidationTarget, ValidationIssue } from "../../shared/response/index.js";

export class RequestValidationError extends AppError {
    readonly code = "VALIDATION_ERROR";
    readonly statusCode = 400;

    constructor(
        public readonly issues: readonly ValidationIssue[],
        options?: { cause?: unknown },
    ) {
        const summary = issues
            .map(issue => {
                const location = issue.path ? `${issue.target}.${issue.path}` : issue.target;
                return `${location}: ${issue.message}`;
            })
            .join("; ");

        super(summary ? `request validation failed: ${summary}` : "request validation failed", options);
    }
}

export class MissingTokenError extends AppError {
    readonly code = "MISSING_TOKEN";
    readonly statusCode = 401;

    constructor(message = "authentication token is required", options?: { cause?: unknown }) {
        super(message, options);
    }
}

export class InvalidAuthorizationHeaderError extends AppError {
    readonly code = "INVALID_AUTHORIZATION_HEADER";
    readonly statusCode = 401;

    constructor(
        message = "authorization header must be in format 'Bearer <token>'",
        options?: { cause?: unknown },
    ) {
        super(message, options);
    }
}

export class ForbiddenError extends AppError {
    readonly code = "FORBIDDEN";
    readonly statusCode = 403;

    constructor(message = "insufficient permissions", options?: { cause?: unknown }) {
        super(message, options);
    }
}

export class PayloadTooLargeError extends AppError {
    readonly code = "PAYLOAD_TOO_LARGE";
    readonly statusCode = 413;

    constructor(
        public readonly maxBytes: number,
        options?: { cause?: unknown },
    ) {
        super("file exceeds the maximum allowed size", options);
    }
}

export class UnsupportedMediaTypeError extends AppError {
    readonly code = "UNSUPPORTED_MEDIA_TYPE";
    readonly statusCode = 415;

    constructor(message = "file type is not supported", options?: { cause?: unknown }) {
        super(message, options);
    }
}


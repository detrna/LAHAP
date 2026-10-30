import { AppError } from "../../shared/errors/app-error.js";

export * from "../../shared/ports/token-provider/errors.js";

export type RequestValidationTarget = "body" | "query" | "params";

export interface ValidationIssue {
    readonly target: RequestValidationTarget;
    readonly path: string;
    readonly message: string;
    readonly code: string;
}

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

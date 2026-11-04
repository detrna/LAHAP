import { AppError } from "../../../shared/errors/app-error.js";

export class InvalidCredentialsError extends AppError {
    readonly code = "INVALID_CREDENTIALS";
    readonly statusCode = 401;

    constructor() {
        super("invalid credentials");
    }
}

export class AuthRepositoryFailureError extends AppError {
    readonly code = "AUTH_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`auth repository operation failed: ${operation}`, { cause });
    }
}

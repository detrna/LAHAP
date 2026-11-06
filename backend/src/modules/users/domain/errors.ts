import { AppError } from "../../../shared/errors/app-error.js";

export class UserNotFoundError extends AppError {
    readonly code = "USER_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly userId: string) {
        super(`user not found: "${userId}"`);
    }
}

export class UsersRepositoryFailureError extends AppError {
    readonly code = "USERS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`users repository operation failed: ${operation}`, { cause });
    }
}

export type UniqueUserField = "phone" | "email";

export class UserAlreadyExistsError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor(
        public readonly field: UniqueUserField,
        options?: { cause?: unknown },
    ) {
        super(`${field} is already registered`, options);
    }
}

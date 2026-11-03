import { AppError } from "../../../shared/errors/app-error.js";

export class NotificationsRepositoryFailureError extends AppError {
    readonly code = "NOTIFICATIONS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`notifications repository operation failed: ${operation}`, { cause });
    }
}

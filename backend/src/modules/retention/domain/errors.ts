import { AppError } from "../../../shared/errors/app-error.js";

export class RetentionRepositoryFailureError extends AppError {
    readonly code = "RETENTION_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`retention repository operation failed: ${operation}`, { cause });
    }
}

export class MessageTemplateNotFoundError extends AppError {
    readonly code = "MESSAGE_TEMPLATE_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly templateId: string) {
        super(`message template not found: "${templateId}"`);
    }
}

export class MessageTemplateAlreadyExistsError extends AppError {
    readonly code = "CONFLICT";
    readonly statusCode = 409;

    constructor() {
        super("message template name is already used");
    }
}

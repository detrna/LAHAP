import { AppError } from "../../../shared/errors/app-error.js";

export class SettingsRepositoryFailureError extends AppError {
    readonly code = "SETTINGS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`settings repository operation failed: ${operation}`, { cause });
    }
}

export class BusinessNotConfiguredError extends AppError {
    readonly code = "BUSINESS_NOT_CONFIGURED";
    readonly statusCode = 500;

    constructor() {
        super("business settings are not configured");
    }
}

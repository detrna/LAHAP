import { AppError } from "../../errors/app-error.js";

export class InvalidLoggerConfigError extends AppError {
    readonly code = "INVALID_LOGGER_CONFIG";
    readonly statusCode = 400;

    constructor(reason = "invalid logger configuration") {
        super(reason);
    }
}

export class LoggerFailureError extends AppError {
    readonly code = "LOGGER_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`logger operation failed: ${operation}`, { cause });
    }
}

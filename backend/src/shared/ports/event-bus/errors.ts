import { AppError } from "../../errors/app-error.js";

export class EventBusFailureError extends AppError {
    readonly code = "EVENT_BUS_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`event bus operation failed: ${operation}`, { cause });
    }
}

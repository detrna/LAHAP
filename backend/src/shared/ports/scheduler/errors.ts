import { AppError } from "../../errors/app-error.js";

export class InvalidScheduleError extends AppError {
    readonly code = "INVALID_SCHEDULE";
    readonly statusCode = 400;

    constructor(
        public readonly scheduleId: string,
        reason = "invalid recurring schedule configuration",
    ) {
        super(`${reason}: "${scheduleId}"`);
    }
}

export class SchedulerFailureError extends AppError {
    readonly code = "SCHEDULER_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`scheduler operation failed: ${operation}`, { cause });
    }
}


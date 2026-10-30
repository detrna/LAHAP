import { AppError } from "../../errors/app-error.js";

export class JobRunNotFoundError extends AppError {
    readonly code = "JOB_RUN_NOT_FOUND";
    readonly statusCode = 404;

    constructor(public readonly jobRunId: string) {
        super(`job run not found: "${jobRunId}"`);
    }
}

export class JobRunRepositoryFailureError extends AppError {
    readonly code = "JOB_RUN_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`job run repository operation failed: ${operation}`, { cause });
    }
}


import { AppError } from "./app-error.js";

export class InvalidStateError extends AppError {
    readonly code = "INVALID_STATE";
    readonly statusCode = 422;

    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options);
    }
}

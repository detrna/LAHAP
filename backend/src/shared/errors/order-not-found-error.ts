import { AppError } from "./app-error.js";

export class OrderNotFoundError extends AppError {
    readonly code = "ORDER_NOT_FOUND";
    readonly statusCode = 404;

    constructor(options?: { cause?: unknown }) {
        super("order not found", options);
    }
}

import { AppError } from "../../../shared/errors/app-error.js";

export class OrdersRepositoryFailureError extends AppError {
    readonly code = "ORDERS_REPOSITORY_FAILURE";
    readonly statusCode = 500;

    constructor(
        public readonly operation: string,
        cause?: unknown,
    ) {
        super(`orders repository operation failed: ${operation}`, { cause });
    }
}

export class SubscriptionNotFoundError extends AppError {
    readonly code = "SUBSCRIPTION_NOT_FOUND";
    readonly statusCode = 404;

    constructor(options?: { cause?: unknown }) {
        super("subscription not found", options);
    }
}

export class PaymentNotFoundError extends AppError {
    readonly code = "PAYMENT_NOT_FOUND";
    readonly statusCode = 404;

    constructor(options?: { cause?: unknown }) {
        super("payment not found", options);
    }
}

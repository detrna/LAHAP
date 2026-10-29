import { AppError } from "../../errors/app-error.js";

export class PaymentGatewayError extends AppError {
    readonly code: string = "PAYMENT_GATEWAY_ERROR";
    readonly statusCode: number = 400;

    constructor(
        message: string,
        options?: { cause?: unknown; code?: string; statusCode?: number },
    ) {
        super(message, { cause: options?.cause });
        if (options?.code) this.code = options.code;
        if (options?.statusCode) this.statusCode = options.statusCode;
    }
}

export class InvalidPaymentTransactionInputError extends PaymentGatewayError {
    override readonly code = "INVALID_PAYMENT_TRANSACTION_INPUT";
    override readonly statusCode = 400;
}

export class DuplicatePaymentOrderIdError extends PaymentGatewayError {
    override readonly code = "DUPLICATE_PAYMENT_ORDER_ID";
    override readonly statusCode = 409;

    constructor(
        public readonly orderId: string,
        options?: { cause?: unknown },
    ) {
        super(`payment order_id has already been used: "${orderId}"`, options);
    }
}

export class InvalidPaymentNotificationError extends PaymentGatewayError {
    override readonly code = "INVALID_PAYMENT_NOTIFICATION";
    override readonly statusCode = 400;
}

export class InvalidPaymentSignatureError extends PaymentGatewayError {
    override readonly code = "INVALID_PAYMENT_SIGNATURE";
    override readonly statusCode = 401;

    constructor(reason = "invalid payment notification signature") {
        super(reason);
    }
}

export class PaymentGatewayProviderError extends PaymentGatewayError {
    override readonly code = "PAYMENT_GATEWAY_PROVIDER_ERROR";
    override readonly statusCode = 502;
}

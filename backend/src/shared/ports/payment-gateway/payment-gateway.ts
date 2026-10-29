export * from "./errors.js";

export interface CreatePaymentTransactionInput {
    readonly orderId: string;
    readonly grossAmount: number;
}

export interface PaymentTransactionResult {
    readonly token: string;
    readonly redirectUrl: string;
    readonly simulatorUrl?: string | undefined;
}

export type PaymentStatus =
    | "PAID"
    | "PENDING"
    | "CHALLENGE"
    | "FAILED"
    | "EXPIRED"
    | "CANCELED"
    | "REFUNDED";

export interface VerifiedPaymentNotification {
    readonly orderId: string;
    readonly transactionId?: string | undefined;
    readonly grossAmount: number;
    readonly status: PaymentStatus;
    readonly rawStatus: string;
    readonly paymentType?: string | undefined;
}

export interface PaymentGateway {
    /** Creates a payment transaction and returns the hosted checkout redirect URL. */
    createTransaction(input: CreatePaymentTransactionInput): Promise<PaymentTransactionResult>;

    /**
     * Verifies an incoming webhook notification payload (including its cryptographic signature)
     * and returns the normalized transaction status.
     * Throws InvalidPaymentNotificationError (400) or InvalidPaymentSignatureError (401) on failure.
     */
    verifyNotification(payload: unknown): VerifiedPaymentNotification;
}

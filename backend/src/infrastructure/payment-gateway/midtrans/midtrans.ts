import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { loadAppConfig, type AppConfig } from "../../../config/app.js";
import type { PaymentGatewayConfig } from "../../../config/payment-gateway.js";
import {
    DuplicatePaymentOrderIdError,
    InvalidPaymentNotificationError,
    InvalidPaymentSignatureError,
    InvalidPaymentTransactionInputError,
    PaymentGatewayError,
    PaymentGatewayProviderError,
} from "../../../shared/ports/payment-gateway/errors.js";
import type {
    CreatePaymentTransactionInput,
    PaymentGateway,
    PaymentStatus,
    PaymentTransactionResult,
    VerifiedPaymentNotification,
} from "../../../shared/ports/payment-gateway/payment-gateway.js";

/** Midtrans Snap enforces a maximum order_id length of 50 characters. */
export const MAX_ORDER_ID_LENGTH = 50;
export const MIDTRANS_BCA_VA_SIMULATOR_URL =
    "https://simulator.sandbox.midtrans.com/bca/va/index";

const midtransSnapResponseSchema = z.object({
    token: z.string().trim().min(1),
    redirect_url: z.url(),
});

const midtransErrorResponseSchema = z.object({
    error_messages: z.array(z.string()).optional(),
});

const midtransNotificationSchema = z.object({
    order_id: z.string().trim().min(1),
    status_code: z.string().trim().min(1),
    gross_amount: z
        .string()
        .trim()
        .min(1)
        .refine(val => Number.isFinite(Number(val)) && Number(val) > 0, {
            message: "gross_amount must be a positive numeric string",
        }),
    signature_key: z.string().trim().min(1),
    transaction_status: z.enum([
        "capture",
        "settlement",
        "pending",
        "deny",
        "cancel",
        "expire",
        "failure",
        "refund",
        "partial_refund",
        "chargeback",
        "partial_chargeback",
    ]),
    fraud_status: z.enum(["accept", "challenge", "deny"]).optional(),
    transaction_id: z.string().trim().min(1).optional(),
    payment_type: z.string().trim().min(1).optional(),
});

function mapMidtransStatus(
    transactionStatus: z.output<typeof midtransNotificationSchema>["transaction_status"],
    fraudStatus?: "accept" | "challenge" | "deny",
): PaymentStatus {
    switch (transactionStatus) {
        case "capture":
            if (fraudStatus === "challenge") return "CHALLENGE";
            if (fraudStatus === "deny") return "FAILED";
            return "PAID";
        case "settlement":
            return "PAID";
        case "pending":
            return "PENDING";
        case "deny":
        case "failure":
            return "FAILED";
        case "expire":
            return "EXPIRED";
        case "cancel":
            return "CANCELED";
        case "refund":
        case "partial_refund":
        case "chargeback":
        case "partial_chargeback":
            return "REFUNDED";
    }
}

export function computeMidtransSignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    serverKey: string,
): string {
    return createHash("sha512")
        .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
        .digest("hex");
}

function isDuplicateOrderId(status: number, messages: readonly string[]): boolean {
    if (status !== 400 && status !== 406 && status !== 409) {
        return false;
    }
    return messages.some(msg => {
        const lower = msg.toLowerCase();
        return (
            lower.includes("order_id") &&
            (lower.includes("already") || lower.includes("taken") || lower.includes("digunakan"))
        );
    });
}

function normalizeInput(input: CreatePaymentTransactionInput): {
    orderId: string;
    grossAmount: number;
} {
    const orderId = input.orderId.trim();
    if (!orderId) {
        throw new InvalidPaymentTransactionInputError("orderId must not be empty");
    }
    if (orderId.length > MAX_ORDER_ID_LENGTH) {
        throw new InvalidPaymentTransactionInputError(
            `orderId must not exceed ${MAX_ORDER_ID_LENGTH} characters`,
        );
    }
    if (!Number.isInteger(input.grossAmount) || input.grossAmount <= 0) {
        throw new InvalidPaymentTransactionInputError("grossAmount must be a positive integer");
    }

    return {
        orderId,
        grossAmount: input.grossAmount,
    };
}

export class MidtransPaymentGateway implements PaymentGateway {
    private readonly serverKey: string;
    private readonly endpoint: string;
    private readonly authHeader: string;
    private readonly timeoutMs: number;
    private readonly maxRetries: number;
    private readonly includeSimulatorUrl: boolean;

    constructor(config: PaymentGatewayConfig, appConfig: AppConfig = loadAppConfig()) {
        const serverKey = config.SERVER_KEY.trim();
        if (!serverKey) {
            throw new Error("MIDTRANS_SERVER_KEY is not set");
        }

        const baseUrl = config.BASE_URL.trim().replace(/\/+$/, "");
        if (!baseUrl) {
            throw new Error("MIDTRANS_BASE_URL is not set");
        }

        this.serverKey = serverKey;
        this.endpoint = `${baseUrl}/snap/v1/transactions`;
        this.authHeader = `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`;
        this.timeoutMs = config.TIMEOUT_MS;
        this.maxRetries = config.MAX_RETRIES;
        this.includeSimulatorUrl = !appConfig.IS_PRODUCTION;
    }

    async createTransaction(
        input: CreatePaymentTransactionInput,
    ): Promise<PaymentTransactionResult> {
        const { orderId, grossAmount } = normalizeInput(input);

        const body = JSON.stringify({
            transaction_details: {
                order_id: orderId,
                gross_amount: grossAmount,
            },
        });

        let response: Response | undefined;
        let lastCause: unknown;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                response = await fetch(this.endpoint, {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: this.authHeader,
                    },
                    body,
                    signal: AbortSignal.timeout(this.timeoutMs),
                });

                if (response.status >= 500 && attempt < this.maxRetries) {
                    continue;
                }
                break;
            } catch (cause) {
                lastCause = cause;
                if (attempt === this.maxRetries) {
                    throw new PaymentGatewayProviderError(
                        "Midtrans payment gateway request failed",
                        { cause: lastCause },
                    );
                }
            }
        }

        if (!response) {
            throw new PaymentGatewayProviderError("Midtrans payment gateway request failed", {
                cause: lastCause,
            });
        }

        let rawJson: unknown;
        try {
            rawJson = await response.json();
        } catch (cause) {
            if (!response.ok) {
                throw new PaymentGatewayProviderError(
                    `Midtrans returned HTTP ${response.status} with non-JSON body`,
                    { cause },
                );
            }
            throw new PaymentGatewayError("Midtrans response was not valid JSON", { cause });
        }

        if (!response.ok) {
            const parsedError = midtransErrorResponseSchema.safeParse(rawJson);
            const errorMessages = parsedError.success ? (parsedError.data.error_messages ?? []) : [];

            if (isDuplicateOrderId(response.status, errorMessages)) {
                throw new DuplicatePaymentOrderIdError(orderId);
            }

            const detail =
                errorMessages.length > 0 ? `: ${errorMessages.join("; ")}` : "";
            throw new PaymentGatewayProviderError(
                `Midtrans request failed with status ${response.status}${detail}`,
            );
        }

        const parsed = midtransSnapResponseSchema.safeParse(rawJson);
        if (!parsed.success) {
            throw new PaymentGatewayError(
                "Midtrans response did not contain a valid token and redirect_url",
                { cause: parsed.error },
            );
        }

        return {
            token: parsed.data.token,
            redirectUrl: parsed.data.redirect_url,
            ...(this.includeSimulatorUrl ? { simulatorUrl: MIDTRANS_BCA_VA_SIMULATOR_URL } : {}),
        };
    }

    verifyNotification(payload: unknown): VerifiedPaymentNotification {
        const parsed = midtransNotificationSchema.safeParse(payload);
        if (!parsed.success) {
            throw new InvalidPaymentNotificationError(
                "Malformed Midtrans webhook notification payload",
                { cause: parsed.error },
            );
        }

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            fraud_status,
            transaction_id,
            payment_type,
        } = parsed.data;

        const expectedSignature = computeMidtransSignature(
            order_id,
            status_code,
            gross_amount,
            this.serverKey,
        );

        const actualBuf = Buffer.from(signature_key.toLowerCase(), "utf8");
        const expectedBuf = Buffer.from(expectedSignature.toLowerCase(), "utf8");

        if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
            throw new InvalidPaymentSignatureError();
        }

        return {
            orderId: order_id,
            transactionId: transaction_id,
            grossAmount: Number(gross_amount),
            status: mapMidtransStatus(transaction_status, fraud_status),
            rawStatus: transaction_status,
            paymentType: payment_type,
        };
    }
}

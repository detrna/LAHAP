import { afterEach, describe, expect, it, vi } from "vitest";
import type { PaymentGatewayConfig } from "../../../config/payment-gateway.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
    DuplicatePaymentOrderIdError,
    InvalidPaymentNotificationError,
    InvalidPaymentSignatureError,
    InvalidPaymentTransactionInputError,
    PaymentGatewayError,
    PaymentGatewayProviderError,
} from "../../../shared/ports/payment-gateway/payment-gateway.js";
import {
    computeMidtransSignature,
    MAX_ORDER_ID_LENGTH,
    MIDTRANS_BCA_VA_SIMULATOR_URL,
    MidtransPaymentGateway,
} from "./midtrans.js";

const dummyConfig: PaymentGatewayConfig = {
    SERVER_KEY: "SB-Mid-server-dummy-key",
    BASE_URL: "https://app.sandbox.midtrans.com",
    TIMEOUT_MS: 15_000,
    MAX_RETRIES: 1,
};

function jsonResponse(body: unknown, status = 201): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

describe("MidtransPaymentGateway (unit)", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor validation", () => {
        it("throws when MIDTRANS_SERVER_KEY is empty", () => {
            expect(() => new MidtransPaymentGateway({ ...dummyConfig, SERVER_KEY: "   " })).toThrow(
                "MIDTRANS_SERVER_KEY is not set",
            );
        });

        it("throws when MIDTRANS_BASE_URL is empty", () => {
            expect(() => new MidtransPaymentGateway({ ...dummyConfig, BASE_URL: "   " })).toThrow(
                "MIDTRANS_BASE_URL is not set",
            );
        });
    });

    describe("input validation", () => {
        const makeGateway = () => new MidtransPaymentGateway(dummyConfig);

        it("throws InvalidPaymentTransactionInputError when orderId is empty", async () => {
            const gateway = makeGateway();

            await expect(
                gateway.createTransaction({ orderId: "   ", grossAmount: 25_000 }),
            ).rejects.toThrow(InvalidPaymentTransactionInputError);
        });

        it("throws InvalidPaymentTransactionInputError when orderId exceeds 50 characters", async () => {
            const gateway = makeGateway();
            const longOrderId = "ord-".padEnd(MAX_ORDER_ID_LENGTH + 1, "x");

            await expect(
                gateway.createTransaction({ orderId: longOrderId, grossAmount: 25_000 }),
            ).rejects.toThrow(InvalidPaymentTransactionInputError);
        });

        it("throws InvalidPaymentTransactionInputError when grossAmount is zero, negative, or non-integer", async () => {
            const gateway = makeGateway();

            await expect(
                gateway.createTransaction({ orderId: "order-1", grossAmount: 0 }),
            ).rejects.toThrow(InvalidPaymentTransactionInputError);

            await expect(
                gateway.createTransaction({ orderId: "order-1", grossAmount: -1000 }),
            ).rejects.toThrow(InvalidPaymentTransactionInputError);

            await expect(
                gateway.createTransaction({ orderId: "order-1", grossAmount: 1000.5 }),
            ).rejects.toThrow(InvalidPaymentTransactionInputError);

            await expect(
                gateway.createTransaction({ orderId: "order-1", grossAmount: Number.NaN }),
            ).rejects.toThrow(InvalidPaymentTransactionInputError);
        });
    });

    describe("createTransaction", () => {
        it("sends a Snap transaction request with Basic Auth and returns redirectUrl", async () => {
            const expectedRedirectUrl =
                "https://app.sandbox.midtrans.com/snap/v4/redirection/66e4fa55-fdac-4ef9-91b5-733b97d1b862";
            const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
                jsonResponse({
                    token: "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
                    redirect_url: expectedRedirectUrl,
                }),
            );

            const gateway = new MidtransPaymentGateway(
                {
                    ...dummyConfig,
                    BASE_URL: "https://app.sandbox.midtrans.com/",
                },
                { IS_PRODUCTION: false, PORT: 4000 },
            );

            const result = await gateway.createTransaction({
                orderId: "  order-123  ",
                grossAmount: 50_000,
            });

            expect(result).toEqual({
                token: "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
                redirectUrl: expectedRedirectUrl,
                simulatorUrl: MIDTRANS_BCA_VA_SIMULATOR_URL,
            });
            expect(fetchSpy).toHaveBeenCalledTimes(1);

            const [url, init] = fetchSpy.mock.calls[0]!;
            expect(url).toBe("https://app.sandbox.midtrans.com/snap/v1/transactions");
            expect(init?.method).toBe("POST");
            expect(init?.headers).toEqual({
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Basic ${Buffer.from(`${dummyConfig.SERVER_KEY}:`).toString("base64")}`,
            });
            expect(JSON.parse(init?.body as string)).toEqual({
                transaction_details: {
                    order_id: "order-123",
                    gross_amount: 50_000,
                },
            });
        });

        it("omits simulatorUrl when IS_PRODUCTION is true", async () => {
            const expectedRedirectUrl =
                "https://app.sandbox.midtrans.com/snap/v4/redirection/66e4fa55-fdac-4ef9-91b5-733b97d1b862";
            vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
                jsonResponse({
                    token: "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
                    redirect_url: expectedRedirectUrl,
                }),
            );

            const gateway = new MidtransPaymentGateway(dummyConfig, {
                IS_PRODUCTION: true,
                PORT: 4000,
            });

            const result = await gateway.createTransaction({
                orderId: "order-prod-123",
                grossAmount: 50_000,
            });

            expect(result).toEqual({
                token: "66e4fa55-fdac-4ef9-91b5-733b97d1b862",
                redirectUrl: expectedRedirectUrl,
            });
        });

        it("throws DuplicatePaymentOrderIdError when Midtrans reports order_id has already been taken", async () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
                jsonResponse(
                    {
                        error_messages: ["transaction_details.order_id has already been taken"],
                    },
                    400,
                ),
            );

            const gateway = new MidtransPaymentGateway(dummyConfig);

            let caught: unknown;
            try {
                await gateway.createTransaction({ orderId: "order-dup", grossAmount: 15_000 });
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeInstanceOf(DuplicatePaymentOrderIdError);
            expect(caught).toBeInstanceOf(PaymentGatewayError);
            expect(caught).toBeInstanceOf(AppError);
            const err = caught as DuplicatePaymentOrderIdError;
            expect(err.code).toBe("DUPLICATE_PAYMENT_ORDER_ID");
            expect(err.statusCode).toBe(409);
            expect(err.orderId).toBe("order-dup");
        });

        it("retries on 5xx responses and succeeds if a retry succeeds", async () => {
            const expectedRedirectUrl =
                "https://app.sandbox.midtrans.com/snap/v4/redirection/retry-token";
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValueOnce(
                    jsonResponse({ error_messages: ["Internal Server Error"] }, 503),
                )
                .mockResolvedValueOnce(
                    jsonResponse({
                        token: "retry-token",
                        redirect_url: expectedRedirectUrl,
                    }),
                );

            const gateway = new MidtransPaymentGateway({ ...dummyConfig, MAX_RETRIES: 1 });
            const result = await gateway.createTransaction({
                orderId: "order-retry",
                grossAmount: 20_000,
            });

            expect(result).toEqual({
                token: "retry-token",
                redirectUrl: expectedRedirectUrl,
                simulatorUrl: MIDTRANS_BCA_VA_SIMULATOR_URL,
            });
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it("retries on network failure and throws PaymentGatewayProviderError after exhausting retries", async () => {
            const networkError = new Error("socket hang up");
            const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(networkError);

            const gateway = new MidtransPaymentGateway({ ...dummyConfig, MAX_RETRIES: 1 });

            let caught: unknown;
            try {
                await gateway.createTransaction({ orderId: "order-net", grossAmount: 20_000 });
            } catch (err) {
                caught = err;
            }

            expect(fetchSpy).toHaveBeenCalledTimes(2);
            expect(caught).toBeInstanceOf(PaymentGatewayProviderError);
            const err = caught as PaymentGatewayProviderError;
            expect(err.code).toBe("PAYMENT_GATEWAY_PROVIDER_ERROR");
            expect(err.statusCode).toBe(502);
            expect(err.cause).toBe(networkError);
        });

        it("throws PaymentGatewayProviderError on non-duplicate 4xx/5xx Midtrans errors", async () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
                jsonResponse(
                    {
                        error_messages: ["Access denied due to unauthorized transaction"],
                    },
                    401,
                ),
            );

            const gateway = new MidtransPaymentGateway(dummyConfig);

            await expect(
                gateway.createTransaction({ orderId: "order-unauth", grossAmount: 20_000 }),
            ).rejects.toThrow(PaymentGatewayProviderError);
        });

        it("throws PaymentGatewayError when 2xx response is missing redirect_url", async () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
                jsonResponse({ token: "only-token" }, 201),
            );

            const gateway = new MidtransPaymentGateway(dummyConfig);

            await expect(
                gateway.createTransaction({ orderId: "order-bad-json", grossAmount: 20_000 }),
            ).rejects.toThrow(PaymentGatewayError);
        });
    });

    describe("verifyNotification", () => {
        const gateway = new MidtransPaymentGateway(dummyConfig);

        function buildValidNotification(
            overrides: Partial<{
                order_id: string;
                status_code: string;
                gross_amount: string;
                transaction_status: string;
                fraud_status: string;
                transaction_id: string;
                payment_type: string;
                signature_key: string;
            }> = {},
        ) {
            const order_id = overrides.order_id ?? "order-123";
            const status_code = overrides.status_code ?? "200";
            const gross_amount = overrides.gross_amount ?? "50000.00";
            const signature_key =
                overrides.signature_key ??
                computeMidtransSignature(
                    order_id,
                    status_code,
                    gross_amount,
                    dummyConfig.SERVER_KEY,
                );

            return {
                order_id,
                status_code,
                gross_amount,
                signature_key,
                transaction_status: overrides.transaction_status ?? "settlement",
                ...(overrides.fraud_status ? { fraud_status: overrides.fraud_status } : {}),
                transaction_id: overrides.transaction_id ?? "tx-abc-123",
                payment_type: overrides.payment_type ?? "qris",
            };
        }

        it("verifies a valid settlement notification and maps status to PAID", () => {
            const notification = buildValidNotification({ transaction_status: "settlement" });
            const verified = gateway.verifyNotification(notification);

            expect(verified).toEqual({
                orderId: "order-123",
                transactionId: "tx-abc-123",
                grossAmount: 50_000,
                status: "PAID",
                rawStatus: "settlement",
                paymentType: "qris",
            });
        });

        it("maps capture status according to fraud_status (accept, challenge, deny)", () => {
            expect(
                gateway.verifyNotification(
                    buildValidNotification({
                        transaction_status: "capture",
                        fraud_status: "accept",
                    }),
                ).status,
            ).toBe("PAID");

            expect(
                gateway.verifyNotification(
                    buildValidNotification({
                        transaction_status: "capture",
                        fraud_status: "challenge",
                    }),
                ).status,
            ).toBe("CHALLENGE");

            expect(
                gateway.verifyNotification(
                    buildValidNotification({
                        transaction_status: "capture",
                        fraud_status: "deny",
                    }),
                ).status,
            ).toBe("FAILED");
        });

        it("maps pending, expire, cancel, deny, and refund statuses accurately", () => {
            expect(
                gateway.verifyNotification(
                    buildValidNotification({ transaction_status: "pending", status_code: "201" }),
                ).status,
            ).toBe("PENDING");

            expect(
                gateway.verifyNotification(
                    buildValidNotification({ transaction_status: "expire", status_code: "407" }),
                ).status,
            ).toBe("EXPIRED");

            expect(
                gateway.verifyNotification(
                    buildValidNotification({ transaction_status: "cancel", status_code: "200" }),
                ).status,
            ).toBe("CANCELED");

            expect(
                gateway.verifyNotification(
                    buildValidNotification({ transaction_status: "deny", status_code: "202" }),
                ).status,
            ).toBe("FAILED");

            expect(
                gateway.verifyNotification(
                    buildValidNotification({
                        transaction_status: "partial_refund",
                        status_code: "200",
                    }),
                ).status,
            ).toBe("REFUNDED");
        });

        it("throws InvalidPaymentSignatureError when signature_key is tampered or uses wrong key", () => {
            const tampered = buildValidNotification({
                signature_key: "0".repeat(128),
            });

            expect(() => gateway.verifyNotification(tampered)).toThrow(
                InvalidPaymentSignatureError,
            );
            try {
                gateway.verifyNotification(tampered);
            } catch (err) {
                expect(err).toBeInstanceOf(InvalidPaymentSignatureError);
                expect((err as InvalidPaymentSignatureError).statusCode).toBe(401);
                expect((err as InvalidPaymentSignatureError).code).toBe(
                    "INVALID_PAYMENT_SIGNATURE",
                );
            }
        });

        it("throws InvalidPaymentNotificationError when payload is missing required fields", () => {
            expect(() => gateway.verifyNotification(null)).toThrow(
                InvalidPaymentNotificationError,
            );
            expect(() => gateway.verifyNotification({ order_id: "order-123" })).toThrow(
                InvalidPaymentNotificationError,
            );
            expect(() =>
                gateway.verifyNotification(
                    buildValidNotification({ gross_amount: "not-a-number" }),
                ),
            ).toThrow(InvalidPaymentNotificationError);
        });
    });
});

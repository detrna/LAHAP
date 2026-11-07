import { describe, expect, it } from "vitest";
import type { VerifiedPaymentNotification } from "../../../../shared/ports/payment-gateway/payment-gateway.js";
import type { PaymentChange, PaymentWithSubscription } from "../interfaces/orders.repository.js";
import {
    buildDeliveryMethodChangeRecord,
    buildOrderRecord,
    buildPaymentRecord,
    buildSubscriptionRecord,
} from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const NOW = "2026-11-06T10:00:00+07:00[Asia/Jakarta]";
const notification = (overrides: Partial<VerifiedPaymentNotification> = {}): VerifiedPaymentNotification => ({
    orderId: "pay-1",
    transactionId: "trx-1",
    grossAmount: 15000,
    status: "PAID",
    rawStatus: "settlement",
    paymentType: "qris",
    ...overrides,
});

function setup(current: PaymentWithSubscription) {
    const context = setupOrdersService(NOW);
    const changes: (PaymentChange | null)[] = [];
    context.repository.changePayment.mockImplementation(
        async (_id: string, decide: (state: PaymentWithSubscription) => PaymentChange | null) => {
            const change = decide(current);
            changes.push(change);
            if (change === null) return { before: current, after: null };
            return {
                before: current,
                after: {
                    payment: { ...current.payment, ...change.payment },
                    subscription: { ...current.subscription, ...change.subscription },
                    ...(current.methodChange !== undefined
                        ? {
                              methodChange: {
                                  ...current.methodChange,
                                  change: { ...current.methodChange.change, ...change.methodChange },
                              },
                          }
                        : {}),
                },
            };
        },
    );
    return { ...context, changes };
}

const pending = (): PaymentWithSubscription => ({
    payment: buildPaymentRecord({ id: "pay-1", amount: 15000, status: "Pending" }),
    subscription: buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Pending" }),
});

describe("OrdersService.handleMidtransNotification (unit)", () => {
    it("marks a paid order Success with the channel, then re-evaluates the tier and notifies", async () => {
        const { service, paymentGateway, repository, changes, tierDiscounts, notifier } = setup(pending());
        paymentGateway.verifyNotification.mockReturnValue(notification());

        await service.handleMidtransNotification({ raw: true });

        expect(paymentGateway.verifyNotification).toHaveBeenCalledWith({ raw: true });
        expect(repository.changePayment).toHaveBeenCalledWith("pay-1", expect.any(Function));
        expect(changes[0]).toEqual({
            payment: {
                status: "Success",
                paidAt: Temporal.PlainDateTime.from("2026-11-06T03:00:00"),
                transactionId: "trx-1",
                method: "MIDTRANS_QRIS",
            },
            subscription: { status: "Success" },
        });
        expect(tierDiscounts.reevaluate).toHaveBeenCalledWith("user-1", { renewWindow: true });
        expect(notifier.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
    });

    it("does nothing on a repeated notification", async () => {
        const paid = pending();
        const current = {
            payment: { ...paid.payment, status: "Success" as const },
            subscription: { ...paid.subscription, status: "Success" as const },
        };
        const { service, paymentGateway, changes, tierDiscounts } = setup(current);
        paymentGateway.verifyNotification.mockReturnValue(notification());

        await service.handleMidtransNotification({});

        expect(changes).toEqual([null]);
        expect(tierDiscounts.reevaluate).not.toHaveBeenCalled();
    });

    it("ignores a notification whose amount differs and logs an error", async () => {
        const { service, paymentGateway, changes, logger } = setup(pending());
        paymentGateway.verifyNotification.mockReturnValue(notification({ grossAmount: 1 }));

        await service.handleMidtransNotification({});

        expect(changes).toEqual([null]);
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ expected: 15000, received: 1 }),
            expect.any(String),
        );
    });

    it("answers quietly for an unknown payment", async () => {
        const { service, paymentGateway, repository, logger } = setup(pending());
        repository.changePayment.mockResolvedValue(null);
        paymentGateway.verifyNotification.mockReturnValue(notification({ orderId: "unknown" }));

        await expect(service.handleMidtransNotification({})).resolves.toBeUndefined();
        expect(logger.warn).toHaveBeenCalled();
    });

    it("records a payment that arrives after expiry and tells the admins", async () => {
        const late = pending();
        const current = {
            payment: { ...late.payment, status: "Expire" as const },
            subscription: { ...late.subscription, status: "Expire" as const },
        };
        const { service, paymentGateway, changes, notifier, tierDiscounts } = setup(current);
        paymentGateway.verifyNotification.mockReturnValue(notification());

        await service.handleMidtransNotification({});

        expect(changes[0]).toMatchObject({ payment: { status: "Success" }, subscription: { needsRefund: true } });
        expect(changes[0]?.subscription?.status).toBeUndefined();
        expect(notifier.notifyAdmins).toHaveBeenCalled();
        expect(tierDiscounts.reevaluate).not.toHaveBeenCalled();
    });

    it("expires the order on a failed or cancelled payment", async () => {
        const { service, paymentGateway, changes } = setup(pending());
        paymentGateway.verifyNotification.mockReturnValue(notification({ status: "CANCELED", rawStatus: "cancel" }));

        await service.handleMidtransNotification({});

        expect(changes[0]).toEqual({ payment: { status: "Expire" }, subscription: { status: "Expire" } });
    });

    it("keeps a challenged payment pending and logs it", async () => {
        const { service, paymentGateway, changes, logger } = setup(pending());
        paymentGateway.verifyNotification.mockReturnValue(notification({ status: "CHALLENGE", rawStatus: "capture" }));

        await service.handleMidtransNotification({});

        expect(changes).toEqual([null]);
        expect(logger.warn).toHaveBeenCalled();
    });

    it("cancels a paid order refunded from the Midtrans dashboard", async () => {
        const paid = pending();
        const current = {
            payment: { ...paid.payment, status: "Success" as const },
            subscription: { ...paid.subscription, status: "Success" as const },
        };
        const { service, paymentGateway, changes, tierDiscounts, notifier } = setup(current);
        paymentGateway.verifyNotification.mockReturnValue(notification({ status: "REFUNDED", rawStatus: "refund" }));

        await service.handleMidtransNotification({});

        expect(changes[0]).toEqual({
            payment: { status: "Refund" },
            subscription: { needsRefund: false, status: "Dibatalkan" },
        });
        expect(tierDiscounts.reevaluate).toHaveBeenCalledWith("user-1", { renewWindow: false });
        expect(notifier.notifyUser).toHaveBeenCalled();
    });

    it("keeps the order waiting for a refund when another paid payment is left", async () => {
        const paid = pending();
        const current = {
            payment: { ...paid.payment, status: "Success" as const },
            subscription: { ...paid.subscription, status: "Success" as const },
            otherPayments: [buildPaymentRecord({ id: "pay-2", status: "Success", type: "DELIVERY_SERVICE_UPGRADE" })],
        };
        const { service, paymentGateway, changes } = setup(current);
        paymentGateway.verifyNotification.mockReturnValue(notification({ status: "REFUNDED", rawStatus: "refund" }));

        await service.handleMidtransNotification({});

        expect(changes[0]).toEqual({
            payment: { status: "Refund" },
            subscription: { needsRefund: true, status: "Dibatalkan" },
        });
    });

    it("lets a bad signature fail the request", async () => {
        const { service, paymentGateway, repository } = setup(pending());
        paymentGateway.verifyNotification.mockImplementation(() => {
            throw new Error("bad signature");
        });

        await expect(service.handleMidtransNotification({})).rejects.toThrow("bad signature");
        expect(repository.changePayment).not.toHaveBeenCalled();
    });
});

describe("OrdersService.handleMidtransNotification for a delivery upgrade (unit)", () => {
    const upgrade = (overrides: { serviceDate?: string; paymentStatus?: "Pending" | "Success" } = {}) => {
        const order = buildOrderRecord({
            id: "o-1",
            serviceDate: Temporal.PlainDate.from(overrides.serviceDate ?? "2026-11-08"),
        });
        return {
            payment: buildPaymentRecord({
                id: "pay-1",
                amount: 15000,
                status: overrides.paymentStatus ?? "Pending",
                type: "DELIVERY_SERVICE_UPGRADE",
            }),
            subscription: buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Success" }),
            otherPayments: [],
            methodChange: {
                change: buildDeliveryMethodChangeRecord({
                    id: "chg-1",
                    toDelivery: true,
                    status: overrides.paymentStatus === "Success" ? "Success" : "Pending",
                    paymentId: "pay-1",
                    amount: 15000,
                    slots: [{ orderId: "o-1", serviceDate: order.serviceDate, fee: 15000 }],
                }),
                orders: [order],
            },
        };
    };
    const paidAt = Temporal.PlainDateTime.from("2026-11-06T03:00:00");

    it("applies a paid upgrade and tells the customer and the admins, without touching the tier", async () => {
        const { service, paymentGateway, changes, tierDiscounts, notifier } = setup(upgrade());
        paymentGateway.verifyNotification.mockReturnValue(notification());

        await service.handleMidtransNotification({});

        expect(changes[0]).toEqual({
            payment: { status: "Success", paidAt, transactionId: "trx-1", method: "MIDTRANS_QRIS" },
            methodChange: { status: "Success", apply: true },
        });
        expect(tierDiscounts.reevaluate).not.toHaveBeenCalled();
        expect(notifier.notifyUser).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1" }));
        expect(notifier.notifyAdmins).toHaveBeenCalledTimes(1);
    });

    it("keeps a payment that came after a slot's cut-off but doesn't apply it", async () => {
        const { service, paymentGateway, changes, notifier } = setup(upgrade({ serviceDate: "2026-11-06" }));
        paymentGateway.verifyNotification.mockReturnValue(notification());

        await service.handleMidtransNotification({});

        expect(changes[0]).toEqual({
            payment: { status: "Success", paidAt, transactionId: "trx-1", method: "MIDTRANS_QRIS" },
            methodChange: { status: "Expire", needsRefund: true },
        });
        expect(notifier.notifyAdmins).toHaveBeenCalledTimes(1);
        expect(notifier.notifyUser).not.toHaveBeenCalled();
    });

    it("expires the change with its payment and leaves the order alone", async () => {
        const { service, paymentGateway, changes } = setup(upgrade());
        paymentGateway.verifyNotification.mockReturnValue(notification({ status: "EXPIRED", rawStatus: "expire" }));

        await service.handleMidtransNotification({});

        expect(changes[0]).toEqual({ payment: { status: "Expire" }, methodChange: { status: "Expire" } });
    });

    it("records a refund from the dashboard without reverting the slots", async () => {
        const { service, paymentGateway, changes, notifier, tierDiscounts } = setup(
            upgrade({ paymentStatus: "Success" }),
        );
        paymentGateway.verifyNotification.mockReturnValue(notification({ status: "REFUNDED", rawStatus: "refund" }));

        await service.handleMidtransNotification({});

        expect(changes[0]).toEqual({ payment: { status: "Refund" }, methodChange: { needsRefund: false } });
        expect(notifier.notifyAdmins).toHaveBeenCalledTimes(1);
        expect(tierDiscounts.reevaluate).not.toHaveBeenCalled();
    });
});

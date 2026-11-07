import { describe, expect, it } from "vitest";
import type { PaymentChange, PaymentWithSubscription } from "../interfaces/orders.repository.js";
import {
    buildDeliveryMethodChangeRecord,
    buildPaymentRecord,
    buildSubscriptionRecord,
} from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

function setup(current: PaymentWithSubscription) {
    const context = setupOrdersService();
    const changes: PaymentChange[] = [];
    context.repository.changePayment.mockImplementation(
        async (_id: string, decide: (state: PaymentWithSubscription) => PaymentChange | null) => {
            const change = decide(current)!;
            changes.push(change);
            return {
                before: current,
                after: {
                    payment: { ...current.payment, ...change.payment },
                    subscription: { ...current.subscription, ...change.subscription },
                },
            };
        },
    );
    return { ...context, changes };
}

describe("OrdersService.confirmRefund (unit)", () => {
    it("marks the payment refunded and clears needsRefund", async () => {
        const { service, changes } = setup({
            payment: buildPaymentRecord({ status: "Success" }),
            subscription: buildSubscriptionRecord({ status: "Dibatalkan", needsRefund: true }),
        });

        expect(await service.confirmRefund("pay-1")).toMatchObject({ status: "Refund" });
        expect(changes).toEqual([{ payment: { status: "Refund" }, subscription: { needsRefund: false } }]);
    });

    it("keeps the order waiting while another paid payment is left to refund", async () => {
        const { service, changes } = setup({
            payment: buildPaymentRecord({ status: "Success" }),
            subscription: buildSubscriptionRecord({ status: "Dibatalkan", needsRefund: true }),
            otherPayments: [
                buildPaymentRecord({ id: "pay-2", status: "Success", type: "DELIVERY_SERVICE_UPGRADE" }),
                buildPaymentRecord({ id: "pay-3", status: "Expire" }),
            ],
        });

        await service.confirmRefund("pay-1");

        expect(changes).toEqual([{ payment: { status: "Refund" }, subscription: { needsRefund: true } }]);
    });

    it("clears the refund of the delivery change an upgrade payment belongs to", async () => {
        const { service, changes } = setup({
            payment: buildPaymentRecord({ status: "Success", type: "DELIVERY_SERVICE_UPGRADE" }),
            subscription: buildSubscriptionRecord({ status: "Dibatalkan", needsRefund: true }),
            otherPayments: [buildPaymentRecord({ id: "pay-0", status: "Refund" })],
            methodChange: {
                change: buildDeliveryMethodChangeRecord({ toDelivery: true, needsRefund: true }),
                orders: [],
            },
        });

        await service.confirmRefund("pay-1");

        expect(changes).toEqual([
            {
                payment: { status: "Refund" },
                subscription: { needsRefund: false },
                methodChange: { needsRefund: false },
            },
        ]);
    });

    it("refuses an order that does not need a refund", async () => {
        const { service } = setup({
            payment: buildPaymentRecord({ status: "Success" }),
            subscription: buildSubscriptionRecord({ status: "Success", needsRefund: false }),
        });

        await expect(service.confirmRefund("pay-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "subscription does not need a refund",
        });
    });

    it("refuses a payment that was never paid", async () => {
        const { service } = setup({
            payment: buildPaymentRecord({ status: "Expire" }),
            subscription: buildSubscriptionRecord({ status: "Dibatalkan", needsRefund: true }),
        });

        await expect(service.confirmRefund("pay-1")).rejects.toMatchObject({ statusCode: 422 });
    });
});

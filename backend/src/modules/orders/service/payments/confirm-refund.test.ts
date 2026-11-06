import { describe, expect, it } from "vitest";
import type { PaymentChange, PaymentWithSubscription } from "../interfaces/orders.repository.js";
import { buildPaymentRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
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

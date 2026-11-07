import { describe, expect, it } from "vitest";
import type { PaymentChange, PaymentWithSubscription } from "../interfaces/orders.repository.js";
import {
    buildDeliveryMethodChangeRecord,
    buildOrderRecord,
    buildPaymentRecord,
    buildSubscriptionRecord,
} from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

function setup(current: PaymentWithSubscription) {
    const context = setupOrdersService("2026-11-06T10:00:00+07:00[Asia/Jakarta]");
    context.repository.changePayment.mockImplementation(
        async (_id: string, decide: (state: PaymentWithSubscription) => PaymentChange | null) => {
            const change = decide(current)!;
            return {
                before: current,
                after: {
                    payment: { ...current.payment, ...change.payment },
                    subscription: { ...current.subscription, ...change.subscription },
                    ...(current.methodChange !== undefined ? { methodChange: current.methodChange } : {}),
                },
            };
        },
    );
    return context;
}

const cash = (overrides: Partial<PaymentWithSubscription["payment"]> = {}, status = "Pending" as const) => ({
    payment: buildPaymentRecord({ id: "pay-1", method: "CASH", status: "Pending", ...overrides }),
    subscription: buildSubscriptionRecord({ userId: "user-1", status }),
});

describe("OrdersService.verifyCashPayment (unit)", () => {
    it("marks a pending cash payment and its order paid", async () => {
        const { service, tierDiscounts } = setup(cash());

        const payment = await service.verifyCashPayment("pay-1");

        expect(payment).toMatchObject({
            status: "Success",
            doneOnline: false,
            paidAt: "2026-11-06T10:00:00.000+07:00",
        });
        expect(tierDiscounts.reevaluate).toHaveBeenCalledWith("user-1", { renewWindow: true });
    });

    it("refuses a gateway payment", async () => {
        const { service } = setup(cash({ method: "MIDTRANS" }));

        await expect(service.verifyCashPayment("pay-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "payment is not a pending cash payment",
        });
    });

    it("refuses a cash payment already handled", async () => {
        const { service } = setup(cash({ status: "Expire" }));

        await expect(service.verifyCashPayment("pay-1")).rejects.toMatchObject({ statusCode: 422 });
    });

    it("answers 404 for an unknown payment", async () => {
        const { service, repository } = setup(cash());
        repository.changePayment.mockResolvedValue(null);

        await expect(service.verifyCashPayment("pay-x")).rejects.toMatchObject({ code: "PAYMENT_NOT_FOUND" });
    });
});

describe("OrdersService.verifyCashPayment for a delivery upgrade (unit)", () => {
    const upgrade = (serviceDate: string) => {
        const order = buildOrderRecord({ id: "o-1", serviceDate: Temporal.PlainDate.from(serviceDate) });
        return {
            payment: buildPaymentRecord({
                id: "pay-1",
                method: "CASH",
                status: "Pending",
                type: "DELIVERY_SERVICE_UPGRADE",
            }),
            subscription: buildSubscriptionRecord({ userId: "user-1", status: "Success" }),
            methodChange: {
                change: buildDeliveryMethodChangeRecord({ toDelivery: true, status: "Pending", paymentId: "pay-1" }),
                orders: [order],
            },
        };
    };

    it("applies the upgrade once the cash is taken", async () => {
        const { service, repository, tierDiscounts, notifier } = setup(upgrade("2026-11-08"));

        await service.verifyCashPayment("pay-1");

        const decide = repository.changePayment.mock.calls[0]![1] as (
            current: PaymentWithSubscription,
        ) => PaymentChange;
        expect(decide(upgrade("2026-11-08"))).toEqual({
            payment: { status: "Success", paidAt: Temporal.PlainDateTime.from("2026-11-06T03:00:00") },
            methodChange: { status: "Success", apply: true },
        });
        expect(tierDiscounts.reevaluate).not.toHaveBeenCalled();
        expect(notifier.notifyAdmins).toHaveBeenCalledTimes(1);
    });

    it("refuses cash for an upgrade whose slots can no longer switch", async () => {
        const { service } = setup(upgrade("2026-11-06"));

        await expect(service.verifyCashPayment("pay-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "delivery method change can no longer be applied",
        });
    });
});

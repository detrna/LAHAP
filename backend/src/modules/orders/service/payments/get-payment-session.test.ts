import { describe, expect, it } from "vitest";
import { buildPaymentRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const SESSION = { snapToken: "snap", redirectUrl: "https://pay.test/snap", expiresAt: "2026-11-03T08:15:00.000+07:00" };

function setup() {
    const context = setupOrdersService();
    context.repository.findSubscriptionById.mockResolvedValue(
        buildSubscriptionRecord({ id: "sub-1", userId: "user-1" }),
    );
    context.repository.findPaymentsBySubscriptionId.mockResolvedValue([
        buildPaymentRecord({ id: "pay-old", status: "Expire" }),
        buildPaymentRecord({ id: "pay-1", status: "Pending" }),
    ]);
    context.cache.get.mockResolvedValue(JSON.stringify(SESSION));
    return context;
}

describe("OrdersService.getPaymentSession (unit)", () => {
    it("returns the stored Snap session of the pending payment", async () => {
        const { service, cache } = setup();

        expect(await service.getPaymentSession("user-1", "sub-1")).toEqual(SESSION);
        expect(cache.get).toHaveBeenCalledWith("payment-session:pay-1");
    });

    it("hides another customer's subscription", async () => {
        const { service } = setup();

        await expect(service.getPaymentSession("user-2", "sub-1")).rejects.toMatchObject({
            statusCode: 404,
            code: "SUBSCRIPTION_NOT_FOUND",
        });
    });

    it("refuses a subscription that is not pending", async () => {
        const { service, repository } = setup();
        repository.findSubscriptionById.mockResolvedValue(
            buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Success" }),
        );

        await expect(service.getPaymentSession("user-1", "sub-1")).rejects.toMatchObject({ statusCode: 422 });
    });

    it("refuses a cash payment", async () => {
        const { service, repository } = setup();
        repository.findPaymentsBySubscriptionId.mockResolvedValue([buildPaymentRecord({ method: "CASH" })]);

        await expect(service.getPaymentSession("user-1", "sub-1")).rejects.toMatchObject({
            message: "cash orders are paid at the cashier",
        });
    });

    it("refuses when the session is gone", async () => {
        const { service, cache } = setup();
        cache.get.mockResolvedValue(null);

        await expect(service.getPaymentSession("user-1", "sub-1")).rejects.toMatchObject({
            statusCode: 422,
            message: "payment session has expired",
        });
    });
});

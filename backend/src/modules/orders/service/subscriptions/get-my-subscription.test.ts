import { describe, expect, it } from "vitest";
import {
    buildOrderRecord,
    buildPaymentRecord,
    buildSubscriptionRecord,
} from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.getMySubscription (unit)", () => {
    it("returns the order with its slots and payments", async () => {
        const { service, repository } = setupOrdersService("2026-11-10T08:00:00+07:00[Asia/Jakarta]");
        repository.findSubscriptionById.mockResolvedValue(
            buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Success" }),
        );
        repository.findOrdersBySubscriptionId.mockResolvedValue([buildOrderRecord({ id: "a" })]);
        repository.findPaymentsBySubscriptionId.mockResolvedValue([buildPaymentRecord({ method: "CASH" })]);

        const subscription = await service.getMySubscription("user-1", "sub-1");

        expect(subscription.displayStatus).toBe("Aktif");
        expect(subscription.orders?.map(order => order.id)).toEqual(["a"]);
        expect(subscription.payments?.[0]?.doneOnline).toBe(false);
    });

    it("hides another customer's order", async () => {
        const { service, repository } = setupOrdersService();
        repository.findSubscriptionById.mockResolvedValue(buildSubscriptionRecord({ userId: "user-2" }));

        await expect(service.getMySubscription("user-1", "sub-1")).rejects.toMatchObject({ statusCode: 404 });
    });
});

import { describe, expect, it } from "vitest";
import { buildUserSummary } from "../../../users/test-utils/factory/users.factory.js";
import { buildPaymentRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService admin subscriptions and payments (unit)", () => {
    it("lists subscriptions with their customers, filtering by Jakarta creation dates", async () => {
        const { service, repository, customers } = setupOrdersService();
        repository.listSubscriptions.mockResolvedValue({
            items: [buildSubscriptionRecord({ userId: "user-1" })],
            total: 1,
        });
        const user = buildUserSummary({ id: "user-1" });
        customers.getSummaries.mockResolvedValue([user]);

        const page = await service.listSubscriptionsForAdmin({
            needsRefund: true,
            from: Temporal.PlainDate.from("2026-11-01"),
            skip: 0,
            take: 20,
        });

        expect(repository.listSubscriptions).toHaveBeenCalledWith({
            needsRefund: true,
            createdFrom: Temporal.PlainDateTime.from("2026-10-31T17:00:00"),
            skip: 0,
            take: 20,
        });
        expect(page.items[0]?.user).toEqual(user);
    });

    it("shows one subscription with the customer, slots and payments", async () => {
        const { service, repository } = setupOrdersService();
        repository.findSubscriptionById.mockResolvedValue(buildSubscriptionRecord({ id: "sub-1" }));
        repository.findPaymentsBySubscriptionId.mockResolvedValue([buildPaymentRecord()]);

        const subscription = await service.getSubscriptionForAdmin("sub-1");

        expect(subscription).toMatchObject({ id: "sub-1", orders: [], payments: [{ status: "Pending" }] });
        repository.findSubscriptionById.mockResolvedValue(null);
        await expect(service.getSubscriptionForAdmin("x")).rejects.toMatchObject({ statusCode: 404 });
    });

    it("lists payments with the filters passed through", async () => {
        const { service, repository } = setupOrdersService();
        repository.listPayments.mockResolvedValue({ items: [buildPaymentRecord({ method: "CASH" })], total: 1 });

        const page = await service.listPaymentsForAdmin({ method: "CASH", skip: 0, take: 10 });

        expect(repository.listPayments).toHaveBeenCalledWith({ method: "CASH", skip: 0, take: 10 });
        expect(page.items[0]?.doneOnline).toBe(false);
    });
});

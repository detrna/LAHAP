import { describe, expect, it } from "vitest";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const DATE = Temporal.PlainDate.from("2026-11-10");
const subscription = buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Success" });
const changedAt = Temporal.PlainDateTime.from("2026-11-06T03:00:00");

describe("OrdersService.skipDay (unit)", () => {
    it("skips only the skippable slots of the day with the same reason", async () => {
        const { service, repository } = setupOrdersService();
        const breakfast = buildOrderRecord({ id: "a", status: "Terjadwal" });
        const lunch = buildOrderRecord({ id: "b", status: "Diantar" });
        repository.findCustomerSlots.mockResolvedValue([
            { order: breakfast, subscription },
            { order: lunch, subscription },
        ]);
        repository.transitionSlots.mockResolvedValue([
            { order: { ...breakfast, status: "Dilewati" }, fromStatus: "Terjadwal", changedAt },
        ]);

        const result = await service.skipDay("user-1", { date: DATE, skipReason: "sakit" });

        expect(repository.findCustomerSlots).toHaveBeenCalledWith({
            userId: "user-1",
            date: DATE,
            subscriptionId: undefined,
            subscriptionStatuses: ["Success"],
        });
        expect(repository.transitionSlots).toHaveBeenCalledWith(
            expect.objectContaining({ orderIds: ["a"], to: "Dilewati", skipReason: "sakit" }),
        );
        expect(result.skippedCount).toBe(1);
        expect(result.orders.map(order => order.id)).toEqual(["a"]);
    });

    it("hides another customer's subscription", async () => {
        const { service, repository } = setupOrdersService();
        repository.findSubscriptionById.mockResolvedValue({ ...subscription, userId: "user-2" });

        await expect(
            service.skipDay("user-1", { date: DATE, subscriptionId: "sub-1", skipReason: null }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });
});

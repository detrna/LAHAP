import { describe, expect, it } from "vitest";
import { buildScheduleSummary } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { buildUserSummary } from "../../../users/test-utils/factory/users.factory.js";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const customer = buildUserSummary({ id: "user-1", role: "CUSTOMER" });
const courier = buildUserSummary({ id: "c-1", role: "COURIER" });
const slot = {
    order: buildOrderRecord({ id: "ord-1", courierId: "c-1" }),
    subscription: buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Success" }),
};

describe("OrdersService.listSlotsForAdmin (unit)", () => {
    it("filters by meal time through the schedules and adds the customer and courier", async () => {
        const { service, repository, catalog, customers } = setupOrdersService(
            "2026-11-10T08:00:00+07:00[Asia/Jakarta]",
        );
        catalog.findSchedules.mockResolvedValue([buildScheduleSummary({ id: "s-1" })]);
        repository.listSlots.mockResolvedValue({ items: [slot], total: 1 });
        customers.getSummaries.mockResolvedValue([customer, courier]);
        const deliveryTime = Temporal.PlainTime.from("12:00");

        const page = await service.listSlotsForAdmin({ deliveryTime, unassigned: false, skip: 0, take: 20 });

        const today = Temporal.PlainDate.from("2026-11-10");
        expect(catalog.findSchedules).toHaveBeenCalledWith({ from: today, to: today, deliveryTime });
        expect(repository.listSlots).toHaveBeenCalledWith({
            date: today,
            menuScheduleIds: ["s-1"],
            unassigned: false,
            skip: 0,
            take: 20,
            subscriptionStatuses: ["Success"],
        });
        expect(page.total).toBe(1);
        expect(page.items[0]).toMatchObject({ courier, subscription: { id: "sub-1", user: customer } });
    });
});

describe("OrdersService.getSlotForAdmin (unit)", () => {
    it("adds the status history with who made each change", async () => {
        const { service, repository, customers } = setupOrdersService();
        repository.findSlotWithSubscription.mockResolvedValue(slot);
        repository.findStatusHistory.mockResolvedValue([
            {
                id: "h-1",
                orderId: "ord-1",
                fromStatus: null,
                toStatus: "Terjadwal",
                changedById: "user-1",
                adminNote: null,
                changedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
            },
            {
                id: "h-2",
                orderId: "ord-1",
                fromStatus: "Terjadwal",
                toStatus: "Disiapkan",
                changedById: null,
                adminNote: null,
                changedAt: Temporal.PlainDateTime.from("2026-11-10T02:00:00"),
            },
        ]);
        customers.getSummaries.mockResolvedValue([customer, courier]);

        const order = await service.getSlotForAdmin("ord-1");

        expect(order.statusHistory).toEqual([
            expect.objectContaining({ id: "h-1", changedBy: customer, changedAt: "2026-11-03T08:00:00.000+07:00" }),
            expect.objectContaining({ id: "h-2", changedBy: null }),
        ]);
    });

    it("answers 404 for an unknown slot", async () => {
        const { service } = setupOrdersService();

        await expect(service.getSlotForAdmin("x")).rejects.toMatchObject({ statusCode: 404 });
    });
});

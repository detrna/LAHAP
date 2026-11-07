import { describe, expect, it } from "vitest";
import { buildScheduleSummary } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { buildUserSummary } from "../../../users/test-utils/factory/users.factory.js";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const delivered = buildSubscriptionRecord({ id: "sub-d", isDelivery: false, status: "Success" });
const pickedUp = buildSubscriptionRecord({ id: "sub-p", isDelivery: true, status: "Success" });

describe("OrdersService.listCourierAssignments (unit)", () => {
    it("counts delivery slots per date and meal time and names a sole courier", async () => {
        const { service, repository, catalog, customers } = setupOrdersService(
            "2026-11-10T08:00:00+07:00[Asia/Jakarta]",
        );
        repository.findSlots.mockResolvedValue([
            {
                order: buildOrderRecord({ id: "a", menuScheduleId: "lunch", courierId: "c-1", isDelivery: true }),
                subscription: delivered,
            },
            {
                order: buildOrderRecord({ id: "b", menuScheduleId: "lunch", courierId: "c-1", isDelivery: true }),
                subscription: delivered,
            },
            {
                order: buildOrderRecord({ id: "c", menuScheduleId: "dinner", courierId: null, isDelivery: true }),
                subscription: delivered,
            },
            {
                order: buildOrderRecord({ id: "d", menuScheduleId: "dinner", courierId: "c-1", isDelivery: true }),
                subscription: delivered,
            },
            {
                order: buildOrderRecord({ id: "e", menuScheduleId: "lunch", isDelivery: false }),
                subscription: pickedUp,
            },
        ]);
        catalog.findSchedules.mockResolvedValue([
            buildScheduleSummary({ id: "lunch", date: "2026-11-10", deliveryTime: { time: "12:00", range: "Siang" } }),
            buildScheduleSummary({ id: "dinner", date: "2026-11-10", deliveryTime: { time: "18:00", range: "Malam" } }),
        ]);
        const courier = buildUserSummary({ id: "c-1", role: "COURIER" });
        customers.getSummaries.mockResolvedValue([courier]);

        const entries = await service.listCourierAssignments({});

        expect(repository.findSlots).toHaveBeenCalledWith(
            expect.objectContaining({
                serviceDateFrom: Temporal.PlainDate.from("2026-11-10"),
                serviceDateTo: Temporal.PlainDate.from("2026-11-16"),
            }),
        );
        expect(entries).toEqual([
            {
                date: "2026-11-10",
                deliveryTime: { time: "12:00", range: "Siang" },
                courier,
                deliveryCount: 2,
                unassignedCount: 0,
            },
            {
                date: "2026-11-10",
                deliveryTime: { time: "18:00", range: "Malam" },
                courier: null,
                deliveryCount: 2,
                unassignedCount: 1,
            },
        ]);
    });
});

describe("OrdersService.assignCourier (unit)", () => {
    it("assigns an active courier to the delivery slots of a meal time", async () => {
        const { service, repository, catalog, customers } = setupOrdersService();
        customers.filterActiveUserIds.mockResolvedValue(["c-1"]);
        catalog.findSchedules.mockResolvedValue([buildScheduleSummary({ id: "lunch" })]);
        repository.findSlots.mockResolvedValue([
            { order: buildOrderRecord({ id: "a", isDelivery: true }), subscription: delivered },
            { order: buildOrderRecord({ id: "b", isDelivery: false }), subscription: pickedUp },
        ]);
        repository.assignCourier.mockResolvedValue(1);
        const date = Temporal.PlainDate.from("2026-11-10");
        const deliveryTime = Temporal.PlainTime.from("12:00");

        const result = await service.assignCourier({ courierId: "c-1", date, deliveryTime });

        expect(catalog.findSchedules).toHaveBeenCalledWith({ from: date, to: date, deliveryTime });
        expect(repository.findSlots).toHaveBeenCalledWith({
            menuScheduleIds: ["lunch"],
            statuses: ["Terjadwal", "Disiapkan", "Diantar"],
            subscriptionStatuses: ["Success"],
        });
        expect(repository.assignCourier).toHaveBeenCalledWith(["a"], "c-1");
        expect(result).toEqual({ updatedCount: 1 });
    });

    it("unassigns explicit slots without checking a courier", async () => {
        const { service, repository, customers } = setupOrdersService();
        repository.findSlots.mockResolvedValue([
            { order: buildOrderRecord({ id: "a", isDelivery: true }), subscription: delivered },
        ]);

        await service.assignCourier({ courierId: null, orderIds: ["a"] });

        expect(customers.filterActiveUserIds).not.toHaveBeenCalled();
        expect(repository.assignCourier).toHaveBeenCalledWith(["a"], null);
    });

    it("refuses someone who is not an active courier", async () => {
        const { service, repository } = setupOrdersService();

        await expect(service.assignCourier({ courierId: "x", orderIds: ["a"] })).rejects.toMatchObject({
            statusCode: 422,
            message: "courier is not an active courier",
        });
        expect(repository.assignCourier).not.toHaveBeenCalled();
    });
});

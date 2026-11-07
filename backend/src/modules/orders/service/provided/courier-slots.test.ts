import { describe, expect, it } from "vitest";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.listCourierSlots (unit)", () => {
    it("asks for the courier's paid delivery slots that are not skipped", async () => {
        const { service, repository } = setupOrdersService();

        await service.listCourierSlots({ courierId: "c-1", scheduleIds: ["s-1", "s-2", "s-1"] });

        expect(repository.findSlots).toHaveBeenCalledWith({
            menuScheduleIds: ["s-1", "s-2"],
            courierId: "c-1",
            isDelivery: true,
            statuses: ["Terjadwal", "Disiapkan", "Diantar", "Siap Diambil", "Selesai"],
            subscriptionStatuses: ["Success"],
        });
    });

    it("gives what the courier needs about each slot", async () => {
        const { service, repository } = setupOrdersService();
        repository.findSlots.mockResolvedValue([
            {
                order: buildOrderRecord({
                    id: "o-1",
                    menuScheduleId: "s-1",
                    status: "Diantar",
                    usesAlternativeMenu: true,
                }),
                subscription: buildSubscriptionRecord({
                    userId: "u-1",
                    recipientName: "Bu Rina",
                    isDelivery: true,
                    deliveryAddress: "Jl. Veteran 1",
                    deliveryLatitude: -7.95,
                    deliveryLongitude: 112.61,
                    notes: "gate code 1234",
                }),
            },
        ]);

        expect(await service.listCourierSlots({ courierId: "c-1", scheduleIds: ["s-1"] })).toEqual([
            {
                orderId: "o-1",
                status: "Diantar",
                menuScheduleId: "s-1",
                usesAlternativeMenu: true,
                userId: "u-1",
                recipientName: "Bu Rina",
                deliveryAddress: "Jl. Veteran 1",
                deliveryLatitude: -7.95,
                deliveryLongitude: 112.61,
                notes: "gate code 1234",
            },
        ]);
    });

    it("answers an empty list without a query when there are no schedules", async () => {
        const { service, repository } = setupOrdersService();

        expect(await service.listCourierSlots({ courierId: "c-1", scheduleIds: [] })).toEqual([]);
        expect(repository.findSlots).not.toHaveBeenCalled();
    });
});

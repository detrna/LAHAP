import { describe, expect, it } from "vitest";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.listKitchenSlots (unit)", () => {
    it("asks for the paid slots of the schedules that are not skipped", async () => {
        const { service, repository } = setupOrdersService();

        await service.listKitchenSlots(["s-1", "s-2", "s-1"]);

        expect(repository.findSlots).toHaveBeenCalledWith({
            menuScheduleIds: ["s-1", "s-2"],
            statuses: ["Terjadwal", "Disiapkan", "Diantar", "Siap Diambil", "Selesai"],
            subscriptionStatuses: ["Success"],
        });
    });

    it("gives what the kitchen needs about each slot", async () => {
        const { service, repository } = setupOrdersService();
        repository.findSlots.mockResolvedValue([
            {
                order: buildOrderRecord({
                    id: "o-1",
                    menuScheduleId: "s-1",
                    usesAlternativeMenu: true,
                    isDelivery: true,
                }),
                subscription: buildSubscriptionRecord({
                    userId: "u-1",
                    recipientName: "Bu Rina",
                    isDelivery: false,
                    notes: "no chili",
                }),
            },
            {
                order: buildOrderRecord({
                    id: "o-2",
                    menuScheduleId: "s-2",
                    usesAlternativeMenu: false,
                    isDelivery: false,
                }),
                subscription: buildSubscriptionRecord({
                    userId: "u-2",
                    recipientName: "Pak Andi",
                    isDelivery: true,
                    notes: null,
                }),
            },
        ]);

        expect(await service.listKitchenSlots(["s-1", "s-2"])).toEqual([
            {
                orderId: "o-1",
                menuScheduleId: "s-1",
                usesAlternativeMenu: true,
                userId: "u-1",
                recipientName: "Bu Rina",
                isDelivery: true,
                notes: "no chili",
            },
            {
                orderId: "o-2",
                menuScheduleId: "s-2",
                usesAlternativeMenu: false,
                userId: "u-2",
                recipientName: "Pak Andi",
                isDelivery: false,
                notes: null,
            },
        ]);
    });

    it("answers an empty list without a query when there are no schedules", async () => {
        const { service, repository } = setupOrdersService();

        expect(await service.listKitchenSlots([])).toEqual([]);
        expect(repository.findSlots).not.toHaveBeenCalled();
    });
});

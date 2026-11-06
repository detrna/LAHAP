import { describe, expect, it } from "vitest";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import type { SlotTransition } from "../interfaces/orders.repository.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const changedAt = Temporal.PlainDateTime.from("2026-11-06T03:00:00");

describe("OrdersService.markFoodReady (unit)", () => {
    it("moves delivery slots to Diantar and pick-up slots to Siap Diambil", async () => {
        const { service, repository, realtime } = setupOrdersService();
        const delivered = buildSubscriptionRecord({ id: "sub-d", isDelivery: true, status: "Success" });
        const pickedUp = buildSubscriptionRecord({ id: "sub-p", isDelivery: false, status: "Success" });
        const a = buildOrderRecord({ id: "a", subscriptionId: "sub-d", status: "Disiapkan" });
        const b = buildOrderRecord({ id: "b", subscriptionId: "sub-p", status: "Disiapkan" });
        repository.findSlots.mockResolvedValue([
            { order: a, subscription: delivered },
            { order: b, subscription: pickedUp },
        ]);
        repository.transitionSlots.mockImplementation(async ({ orderIds, to }: SlotTransition) =>
            orderIds.map((id: string) => ({
                order: { ...(id === "a" ? a : b), status: to },
                fromStatus: "Disiapkan",
                changedAt,
            })),
        );

        const result = await service.markFoodReady("kitchen-1", { menuScheduleId: "s-1", usesAlternativeMenu: false });

        expect(repository.findSlots).toHaveBeenCalledWith({
            menuScheduleIds: ["s-1"],
            usesAlternativeMenu: false,
            statuses: ["Disiapkan"],
            subscriptionStatuses: ["Success"],
        });
        expect(repository.transitionSlots).toHaveBeenCalledWith({
            orderIds: ["a"],
            from: ["Disiapkan"],
            to: "Diantar",
            actorId: "kitchen-1",
        });
        expect(repository.transitionSlots).toHaveBeenCalledWith({
            orderIds: ["b"],
            from: ["Disiapkan"],
            to: "Siap Diambil",
            actorId: "kitchen-1",
        });
        expect(result).toEqual({ updatedCount: 2 });
        expect(realtime.publish).toHaveBeenCalledTimes(2);
    });

    it("takes explicit slots", async () => {
        const { service, repository } = setupOrdersService();

        expect(await service.markFoodReady("kitchen-1", { orderIds: ["a", "b"] })).toEqual({ updatedCount: 0 });
        expect(repository.findSlots).toHaveBeenCalledWith(expect.objectContaining({ orderIds: ["a", "b"] }));
    });
});

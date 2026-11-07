import { describe, expect, it } from "vitest";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.getSlotForObstacle (unit)", () => {
    it("gives who the slot belongs to and where it stands", async () => {
        const { service, repository } = setupOrdersService();
        repository.findSlotWithSubscription.mockResolvedValue({
            order: buildOrderRecord({
                id: "o-1",
                courierId: "c-1",
                status: "Diantar",
                menuScheduleId: "s-1",
            }),
            subscription: buildSubscriptionRecord({ userId: "u-1", isDelivery: true, status: "Success" }),
        });

        expect(await service.getSlotForObstacle("o-1")).toEqual({
            userId: "u-1",
            courierId: "c-1",
            status: "Diantar",
            isDelivery: true,
            subscriptionStatus: "Success",
            menuScheduleId: "s-1",
        });
        expect(repository.findSlotWithSubscription).toHaveBeenCalledWith("o-1");
    });

    it("answers null for an unknown slot", async () => {
        const { service, repository } = setupOrdersService();
        repository.findSlotWithSubscription.mockResolvedValue(null);

        expect(await service.getSlotForObstacle("missing")).toBeNull();
    });
});

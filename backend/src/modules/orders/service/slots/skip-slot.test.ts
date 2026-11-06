import { describe, expect, it } from "vitest";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const subscription = buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Success" });
const changedAt = Temporal.PlainDateTime.from("2026-11-06T03:00:00");

function setup(status: "Terjadwal" | "Disiapkan" | "Diantar" = "Terjadwal") {
    const context = setupOrdersService();
    const order = buildOrderRecord({ id: "ord-1", subscriptionId: "sub-1", status, courierId: "courier-1" });
    context.repository.findSlotWithSubscription.mockResolvedValue({ order, subscription });
    context.repository.transitionSlots.mockResolvedValue([
        { order: { ...order, status: "Dilewati", skipReason: "mudik" }, fromStatus: status, changedAt },
    ]);
    return context;
}

describe("OrdersService.skipSlot (unit)", () => {
    it("skips a slot before food-ready, records the reason and publishes the change", async () => {
        const { service, repository, realtime } = setup("Disiapkan");

        const order = await service.skipSlot("user-1", "ord-1", "mudik");

        expect(repository.transitionSlots).toHaveBeenCalledWith({
            orderIds: ["ord-1"],
            from: ["Terjadwal", "Disiapkan"],
            to: "Dilewati",
            actorId: "user-1",
            skipReason: "mudik",
        });
        expect(order).toMatchObject({ id: "ord-1", status: "Dilewati", skipReason: "mudik" });
        expect(realtime.publish).toHaveBeenCalledWith(
            { userIds: ["user-1", "courier-1"], roles: ["ADMIN", "KITCHEN"] },
            {
                event: "slot.status",
                data: {
                    orderId: "ord-1",
                    subscriptionId: "sub-1",
                    fromStatus: "Disiapkan",
                    toStatus: "Dilewati",
                    changedAt: "2026-11-06T10:00:00.000+07:00",
                },
            },
        );
    });

    it("refuses once the food is ready", async () => {
        const { service, repository } = setup("Diantar");

        await expect(service.skipSlot("user-1", "ord-1", null)).rejects.toMatchObject({
            statusCode: 422,
            message: "slot is not skippable",
        });
        expect(repository.transitionSlots).not.toHaveBeenCalled();
    });

    it("hides another customer's slot", async () => {
        const { service } = setup();

        await expect(service.skipSlot("user-2", "ord-1", null)).rejects.toMatchObject({
            statusCode: 404,
            code: "ORDER_NOT_FOUND",
        });
    });

    it("still answers when the live event fails", async () => {
        const { service, realtime, logger } = setup();
        realtime.publish.mockRejectedValue(new Error("redis down"));

        await expect(service.skipSlot("user-1", "ord-1", null)).resolves.toMatchObject({ status: "Dilewati" });
        expect(logger.warn).toHaveBeenCalled();
    });

    it("refuses when the slot moved on in between", async () => {
        const { service, repository } = setup();
        repository.transitionSlots.mockResolvedValue([]);

        await expect(service.skipSlot("user-1", "ord-1", null)).rejects.toMatchObject({ statusCode: 422 });
    });
});

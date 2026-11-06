import { describe, expect, it } from "vitest";
import type { OrderStatus } from "../../domain/order.domain.js";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const changedAt = Temporal.PlainDateTime.from("2026-11-06T03:00:00");

function setup(status: OrderStatus, courierId: string | null = "courier-1") {
    const context = setupOrdersService();
    const order = buildOrderRecord({ id: "ord-1", status, courierId });
    const subscription = buildSubscriptionRecord({ id: order.subscriptionId, status: "Success" });
    context.repository.findSlotWithSubscription.mockResolvedValue({ order, subscription });
    context.repository.transitionSlots.mockImplementation(async ({ to }: { to: OrderStatus }) => [
        { order: { ...order, status: to }, fromStatus: status, changedAt },
    ]);
    return context;
}

describe("OrdersService.completeDelivery (unit)", () => {
    it("lets the assigned courier complete a delivery", async () => {
        const { service, repository } = setup("Diantar");

        const order = await service.completeDelivery({ userId: "courier-1", role: "COURIER" }, "ord-1");

        expect(order.status).toBe("Selesai");
        expect(repository.transitionSlots).toHaveBeenCalledWith({
            orderIds: ["ord-1"],
            from: ["Diantar"],
            to: "Selesai",
            actorId: "courier-1",
        });
    });

    it("hides another courier's slot, but lets an admin complete it", async () => {
        const { service } = setup("Diantar");

        await expect(service.completeDelivery({ userId: "courier-2", role: "COURIER" }, "ord-1")).rejects.toMatchObject(
            { statusCode: 404 },
        );
        await expect(service.completeDelivery({ userId: "admin-1", role: "ADMIN" }, "ord-1")).resolves.toMatchObject({
            status: "Selesai",
        });
    });

    it("refuses a slot that is not out for delivery", async () => {
        const { service } = setup("Disiapkan");

        await expect(service.completeDelivery({ userId: "courier-1", role: "COURIER" }, "ord-1")).rejects.toMatchObject(
            { statusCode: 422, message: "slot is not out for delivery" },
        );
    });
});

describe("OrdersService.completePickup (unit)", () => {
    it("completes a collected pick-up", async () => {
        const { service } = setup("Siap Diambil", null);

        expect((await service.completePickup("admin-1", "ord-1")).status).toBe("Selesai");
    });

    it("refuses a slot that is not ready for pick-up", async () => {
        const { service } = setup("Diantar");

        await expect(service.completePickup("admin-1", "ord-1")).rejects.toMatchObject({ statusCode: 422 });
    });
});

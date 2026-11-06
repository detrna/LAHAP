import { describe, expect, it } from "vitest";
import type { OrderStatus } from "../../domain/order.domain.js";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

function setup(status: OrderStatus, isDelivery = true) {
    const context = setupOrdersService();
    const order = buildOrderRecord({ id: "ord-1", status });
    const subscription = buildSubscriptionRecord({ id: order.subscriptionId, status: "Success", isDelivery });
    context.repository.findSlotWithSubscription.mockResolvedValue({ order, subscription });
    context.repository.transitionSlots.mockImplementation(async ({ to }: { to: OrderStatus }) => [
        {
            order: { ...order, status: to },
            fromStatus: status,
            changedAt: Temporal.PlainDateTime.from("2026-11-06T03:00:00"),
        },
    ]);
    return context;
}

describe("OrdersService.correctSlotStatus (unit)", () => {
    it("moves a slot forward on its path with the admin's note", async () => {
        const { service, repository } = setup("Disiapkan");

        const order = await service.correctSlotStatus("admin-1", "ord-1", {
            status: "Selesai",
            adminNote: "Kurir lupa menandai Selesai",
        });

        expect(order.status).toBe("Selesai");
        expect(repository.transitionSlots).toHaveBeenCalledWith({
            orderIds: ["ord-1"],
            from: ["Disiapkan"],
            to: "Selesai",
            actorId: "admin-1",
            adminNote: "Kurir lupa menandai Selesai",
        });
    });

    it("skips a slot before food-ready and keeps the note as the reason", async () => {
        const { service, repository } = setup("Terjadwal");

        await service.correctSlotStatus("admin-1", "ord-1", { status: "Dilewati", adminNote: "pelanggan telepon" });

        expect(repository.transitionSlots).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "Dilewati",
                adminNote: "pelanggan telepon",
                skipReason: "pelanggan telepon",
            }),
        );
    });

    it.each([
        ["back to an earlier status", "Diantar", "Disiapkan", true],
        ["to the other path", "Disiapkan", "Siap Diambil", true],
        ["to Dilewati after food-ready", "Diantar", "Dilewati", true],
    ] as const)("refuses going %s", async (_, from, to, isDelivery) => {
        const { service, repository } = setup(from, isDelivery);

        await expect(
            service.correctSlotStatus("admin-1", "ord-1", { status: to, adminNote: "x" }),
        ).rejects.toMatchObject({
            statusCode: 422,
        });
        expect(repository.transitionSlots).not.toHaveBeenCalled();
    });
});

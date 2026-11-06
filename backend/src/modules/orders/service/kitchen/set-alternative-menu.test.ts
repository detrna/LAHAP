import { describe, expect, it } from "vitest";
import { buildAllergy, buildMenu, buildMenuSchedule } from "../../../catalog/test-utils/factory/catalog.factory.js";
import type { OrderStatus } from "../../domain/order.domain.js";
import { buildOrderRecord, buildSubscriptionRecord } from "../../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

const NUTS = buildAllergy({ id: "nuts", name: "Kacang" });
const primary = buildMenu({ id: "m-1", name: "Sate Ayam", allergies: [NUTS] });
const alternative = buildMenu({ id: "m-2", name: "Ayam Bakar", allergies: [] });
const subscription = buildSubscriptionRecord({ id: "sub-1", userId: "user-1", status: "Success" });

function setup(status: OrderStatus = "Disiapkan", withAlternative = true) {
    const context = setupOrdersService();
    const order = buildOrderRecord({ id: "ord-1", menuScheduleId: "s-1", status });
    context.repository.findSlotWithSubscription.mockResolvedValue({ order, subscription });
    context.repository.setUsesAlternativeMenu.mockImplementation(async ({ usesAlternativeMenu }) => ({
        ...order,
        usesAlternativeMenu,
    }));
    context.catalog.getSchedulesByIds.mockResolvedValue([
        buildMenuSchedule({
            id: "s-1",
            menus: [
                { menuId: "m-1", isPrimary: true, menu: primary },
                ...(withAlternative ? [{ menuId: "m-2", isPrimary: false, menu: alternative }] : []),
            ],
        }),
    ]);
    context.customers.getAllergyProfiles.mockResolvedValue([
        { userId: "user-1", allergyIds: ["nuts"], allergyNote: null },
    ]);
    return context;
}

describe("OrdersService.setAlternativeMenu (unit)", () => {
    it("assigns the alternative, names the clashing allergy and publishes the new menu", async () => {
        const { service, repository, notifier, realtime } = setup();

        const order = await service.setAlternativeMenu("ord-1", true);

        expect(repository.setUsesAlternativeMenu).toHaveBeenCalledWith({
            orderId: "ord-1",
            usesAlternativeMenu: true,
            allowedStatuses: ["Terjadwal", "Disiapkan"],
        });
        expect(order).toMatchObject({ usesAlternativeMenu: true, menu: { id: "m-2" } });
        expect(notifier.notifyUser).toHaveBeenCalledWith({
            userId: "user-1",
            title: "Menu diganti",
            body: "Menu kamu diganti ke Ayam Bakar karena alergi Kacang.",
        });
        expect(realtime.publish).toHaveBeenCalledWith(
            { userIds: ["user-1"], roles: ["ADMIN", "KITCHEN"] },
            { event: "slot.menu", data: { orderId: "ord-1", usesAlternativeMenu: true, menu: alternative } },
        );
    });

    it("refuses a schedule without an alternative", async () => {
        const { service } = setup("Disiapkan", false);

        await expect(service.setAlternativeMenu("ord-1", true)).rejects.toMatchObject({
            statusCode: 422,
            message: "schedule has no alternative menu",
        });
    });

    it("refuses once the food is ready", async () => {
        const { service, repository } = setup("Diantar");

        await expect(service.setAlternativeMenu("ord-1", true)).rejects.toMatchObject({ statusCode: 422 });
        expect(repository.setUsesAlternativeMenu).not.toHaveBeenCalled();
    });

    it("changes nothing when the slot already serves that menu", async () => {
        const { service, repository, notifier } = setup();

        await service.setAlternativeMenu("ord-1", false);

        expect(repository.setUsesAlternativeMenu).not.toHaveBeenCalled();
        expect(notifier.notifyUser).not.toHaveBeenCalled();
    });

    it("answers 404 for a slot of an unpaid order", async () => {
        const { service, repository } = setup();
        repository.findSlotWithSubscription.mockResolvedValue({
            order: buildOrderRecord(),
            subscription: { ...subscription, status: "Pending" },
        });

        await expect(service.setAlternativeMenu("ord-1", true)).rejects.toMatchObject({ statusCode: 404 });
    });
});

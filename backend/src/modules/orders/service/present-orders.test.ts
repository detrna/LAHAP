import { describe, expect, it } from "vitest";
import { buildMenu, buildMenuSchedule } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildOrderRecord } from "../test-utils/factory/orders.factory.js";
import { setupOrdersService } from "../test-utils/setup/orders.setup.js";

describe("OrdersService.presentOrders (unit)", () => {
    it("adds each slot's schedule, served menu, obstacles and completion time", async () => {
        const { service, catalog, obstacles, repository } = setupOrdersService();
        const primary = buildMenu({ id: "m-1" });
        const alternative = buildMenu({ id: "m-2", isAlternative: true });
        catalog.getSchedulesByIds.mockResolvedValue([
            buildMenuSchedule({
                id: "s-1",
                menus: [
                    { menuId: "m-1", isPrimary: true, menu: primary },
                    { menuId: "m-2", isPrimary: false, menu: alternative },
                ],
            }),
        ]);
        obstacles.findObstaclesByOrderIds.mockResolvedValue([
            {
                id: "o-1",
                orderId: "b",
                authorId: "c-1",
                note: "macet",
                photoKey: null,
                photoUrl: null,
                createdAt: "2026-11-03T08:00:00.000+07:00",
            },
        ]);
        repository.findCompletionTimes.mockResolvedValue(
            new Map([["a", Temporal.PlainDateTime.from("2026-11-03T05:00:00")]]),
        );

        const [first, second] = await service.presentOrders([
            buildOrderRecord({
                id: "a",
                menuScheduleId: "s-1",
                status: "Selesai",
                isDelivery: true,
                deliveryFee: 4000,
            }),
            buildOrderRecord({ id: "b", menuScheduleId: "s-1", usesAlternativeMenu: true }),
        ]);

        expect(catalog.getSchedulesByIds).toHaveBeenCalledWith(["s-1"]);
        expect(first).toMatchObject({
            menu: { id: "m-1" },
            obstacles: [],
            completedAt: "2026-11-03T12:00:00.000+07:00",
            isDelivery: true,
            deliveryFee: 4000,
        });
        expect(second).toMatchObject({ menu: { id: "m-2" }, completedAt: null, isDelivery: false, deliveryFee: 0 });
        expect(second?.obstacles).toHaveLength(1);
    });

    it("answers an empty list without lookups", async () => {
        const { service, catalog } = setupOrdersService();

        expect(await service.presentOrders([])).toEqual([]);
        expect(catalog.getSchedulesByIds).not.toHaveBeenCalled();
    });
});

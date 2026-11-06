import { describe, expect, it } from "vitest";
import { buildMenu, buildScheduleSummary } from "../../../catalog/test-utils/factory/catalog.factory.js";
import { setupOrdersService } from "../../test-utils/setup/orders.setup.js";

describe("OrdersService.getDashboard (unit)", () => {
    it("combines income, the top menus, the week's shortages and the admin's unread count", async () => {
        const { service, repository, catalog, shoppingList, unreadCount } = setupOrdersService(
            "2026-11-12T10:00:00+07:00[Asia/Jakarta]",
        );
        repository.countPortions.mockResolvedValue([
            { menuScheduleId: "s-1", usesAlternativeMenu: false, portions: 3 },
            { menuScheduleId: "s-1", usesAlternativeMenu: true, portions: 1 },
            { menuScheduleId: "s-2", usesAlternativeMenu: false, portions: 2 },
        ]);
        catalog.findSchedules.mockResolvedValue([
            buildScheduleSummary({ id: "s-1", primaryMenuId: "sate", alternativeMenuId: "bakar" }),
            buildScheduleSummary({ id: "s-2", primaryMenuId: "sate" }),
        ]);
        catalog.getMenusByIds.mockResolvedValue([
            buildMenu({ id: "sate", name: "Sate" }),
            buildMenu({ id: "bakar", name: "Ayam Bakar" }),
        ]);
        unreadCount.countUnread.mockResolvedValue(2);

        const stats = await service.getDashboard("admin-1", "today");

        expect(stats.topMenus).toEqual([
            { menuId: "sate", name: "Sate", portions: 5 },
            { menuId: "bakar", name: "Ayam Bakar", portions: 1 },
        ]);
        expect(shoppingList.getShoppingList).toHaveBeenCalledWith({
            from: Temporal.PlainDate.from("2026-11-12"),
            to: Temporal.PlainDate.from("2026-11-18"),
        });
        expect(unreadCount.countUnread).toHaveBeenCalledWith("admin-1");
        expect(stats).toMatchObject({
            period: "today",
            from: "2026-11-12",
            to: "2026-11-12",
            unreadNotificationCount: 2,
        });
        expect(stats.income.orderCount).toBe(0);
    });
});

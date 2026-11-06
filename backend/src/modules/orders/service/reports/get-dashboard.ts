import type { OrderStatus } from "../../domain/order.domain.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { DashboardStats } from "../../domain/report.domain.js";
import { reportPeriodRange, type ReportPeriod } from "../../domain/report-period.js";
import type { OrdersService } from "../orders.service.js";

const TOP_MENUS = 5;
const SHORTAGE_DAYS = 7;
const SERVED_STATUSES: readonly OrderStatus[] = ["Terjadwal", "Disiapkan", "Diantar", "Siap Diambil", "Selesai"];

async function findTopMenus(service: OrdersService, from: Temporal.PlainDate, to: Temporal.PlainDate) {
    const counts = await service.ordersRepository.countPortions({
        serviceDateFrom: from,
        serviceDateTo: to,
        statuses: SERVED_STATUSES,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    if (counts.length === 0) return [];
    const schedules = await service.catalog.findSchedules({
        ids: [...new Set(counts.map(count => count.menuScheduleId))],
    });
    const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));
    const portionsByMenu = new Map<string, number>();
    for (const count of counts) {
        const schedule = scheduleById.get(count.menuScheduleId);
        const menuId = count.usesAlternativeMenu ? schedule?.alternativeMenuId : schedule?.primaryMenuId;
        if (menuId === undefined || menuId === null) continue;
        portionsByMenu.set(menuId, (portionsByMenu.get(menuId) ?? 0) + count.portions);
    }
    const top = [...portionsByMenu.entries()].sort(([, a], [, b]) => b - a).slice(0, TOP_MENUS);
    const menus = await service.catalog.getMenusByIds(top.map(([menuId]) => menuId));
    const nameById = new Map(menus.map(menu => [menu.id, menu.name]));
    return top.map(([menuId, portions]) => ({ menuId, name: nameById.get(menuId) ?? "", portions }));
}

export async function getDashboard(
    this: OrdersService,
    adminId: string,
    period: ReportPeriod,
): Promise<DashboardStats> {
    const today = this.clock.now().toPlainDate();
    const { from, to } = reportPeriodRange(period, today);
    const [report, topMenus, shortages, unreadNotificationCount] = await Promise.all([
        this.getIncomeReport(period),
        findTopMenus(this, from, to),
        this.shoppingList.getShoppingList({ from: today, to: today.add({ days: SHORTAGE_DAYS - 1 }) }),
        this.unreadCount.countUnread(adminId),
    ]);
    return {
        period,
        from: from.toString(),
        to: to.toString(),
        income: report.total,
        topMenus,
        shortages,
        unreadNotificationCount,
    };
}

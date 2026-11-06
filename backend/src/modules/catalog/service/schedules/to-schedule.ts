import { toIsoTimestamp } from "../../../../shared/time/timestamp.js";
import { toMealTimeView } from "../../../../shared/utils/meal-time/meal-time.js";
import type { Menu } from "../../domain/menu.domain.js";
import type { MenuSchedule, ScheduleMenu, ScheduleSummary } from "../../domain/schedule.domain.js";
import type { ScheduleRecord } from "../interfaces/catalog.repository.js";

function toScheduleMenu(menuId: string, isPrimary: boolean, menuById: ReadonlyMap<string, Menu>): ScheduleMenu {
    const menu = menuById.get(menuId);
    return { menuId, isPrimary, ...(menu !== undefined ? { menu } : {}) };
}

export function toSchedule(record: ScheduleRecord, menuById: ReadonlyMap<string, Menu>): MenuSchedule {
    const menus = [
        ...(record.primaryMenuId !== null ? [toScheduleMenu(record.primaryMenuId, true, menuById)] : []),
        ...(record.alternativeMenuId !== null ? [toScheduleMenu(record.alternativeMenuId, false, menuById)] : []),
    ];
    return {
        id: record.id,
        packageId: record.packageId,
        date: record.date.toString(),
        deliveryTime: toMealTimeView(record.deliveryTime),
        isPublished: record.isPublished,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
        menus,
    };
}

export function toScheduleSummary(record: ScheduleRecord): ScheduleSummary {
    return {
        id: record.id,
        packageId: record.packageId,
        date: record.date.toString(),
        deliveryTime: toMealTimeView(record.deliveryTime),
        isPublished: record.isPublished,
        primaryMenuId: record.primaryMenuId,
        alternativeMenuId: record.alternativeMenuId,
    };
}

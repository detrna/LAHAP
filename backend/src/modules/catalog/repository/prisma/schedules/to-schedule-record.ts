import type { ScheduleRecord } from "../../../service/interfaces/catalog.repository.js";

export interface ScheduleRow {
    readonly id: string;
    readonly packageId: string;
    readonly date: Temporal.PlainDate;
    readonly deliveryTime: Temporal.PlainTime;
    readonly isPublished: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
    readonly scheduleMenus: readonly { readonly menuId: string; readonly isPrimary: boolean }[];
}

export function toScheduleRecord(row: ScheduleRow): ScheduleRecord {
    return {
        id: row.id,
        packageId: row.packageId,
        date: row.date,
        deliveryTime: row.deliveryTime,
        isPublished: row.isPublished,
        primaryMenuId: row.scheduleMenus.find(link => link.isPrimary)?.menuId ?? null,
        alternativeMenuId: row.scheduleMenus.find(link => !link.isPrimary)?.menuId ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

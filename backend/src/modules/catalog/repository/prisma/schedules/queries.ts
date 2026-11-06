import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import type { ScheduleFilter } from "../../../service/interfaces/catalog.repository.js";

type Orm = Db["orm"];

export const schedulesWithMenus = (orm: Orm) =>
    orm.public.Schedule.include("scheduleMenus", link => link.select("menuId", "isPrimary"));

export function filterSchedules<T extends ReturnType<typeof schedulesWithMenus> | Orm["public"]["Schedule"]>(
    schedules: T,
    filter: ScheduleFilter,
): T {
    let filtered = schedules;
    if (filter.ids !== undefined) {
        const ids = filter.ids as Varchar<36>[];
        filtered = filtered.where(schedule => schedule.id.in(ids)) as T;
    }
    if (filter.packageId !== undefined) filtered = filtered.where({ packageId: filter.packageId }) as T;
    if (filter.from !== undefined) {
        const from = filter.from;
        filtered = filtered.where(schedule => schedule.date.gte(from)) as T;
    }
    if (filter.to !== undefined) {
        const to = filter.to;
        filtered = filtered.where(schedule => schedule.date.lte(to)) as T;
    }
    if (filter.deliveryTime !== undefined) {
        const deliveryTime = filter.deliveryTime;
        filtered = filtered.where(schedule => schedule.deliveryTime.eq(deliveryTime)) as T;
    }
    if (filter.isPublished !== undefined) filtered = filtered.where({ isPublished: filter.isPublished }) as T;
    return filtered;
}

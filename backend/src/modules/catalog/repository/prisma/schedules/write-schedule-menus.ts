import type { Db } from "../../../../../infrastructure/database/prisma/db.js";

type Orm = Db["orm"];

export async function writeScheduleMenus(
    orm: Orm,
    scheduleId: string,
    primaryMenuId: string | null,
    alternativeMenuId: string | null,
): Promise<void> {
    await orm.public.ScheduleMenu.where({ scheduleId }).deleteAndCount();
    const links = [
        ...(primaryMenuId !== null ? [{ scheduleId, menuId: primaryMenuId, isPrimary: true }] : []),
        ...(alternativeMenuId !== null ? [{ scheduleId, menuId: alternativeMenuId, isPrimary: false }] : []),
    ];
    if (links.length > 0) await orm.public.ScheduleMenu.createAll(links);
}

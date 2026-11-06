import type { ScheduleMenuRole } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function findScheduleIdsUsingMenu(
    this: PrismaCatalogRepository,
    menuId: string,
    role?: ScheduleMenuRole,
): Promise<readonly string[]> {
    try {
        const links = this.db.orm.public.ScheduleMenu.where({ menuId });
        const rows = await (role === undefined ? links : links.where({ isPrimary: role === "primary" }))
            .select("scheduleId")
            .all();
        return [...new Set(rows.map(row => row.scheduleId))];
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findScheduleIdsUsingMenu", cause);
    }
}

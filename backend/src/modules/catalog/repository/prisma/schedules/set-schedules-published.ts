import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { PublishTarget } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function setSchedulesPublished(
    this: PrismaCatalogRepository,
    target: PublishTarget,
    isPublished: boolean,
): Promise<number> {
    if ("ids" in target && target.ids.length === 0) return 0;

    try {
        let schedules =
            "ids" in target
                ? this.db.orm.public.Schedule.where(schedule => schedule.id.in(target.ids as Varchar<36>[]))
                : this.db.orm.public.Schedule.where({ packageId: target.packageId })
                      .where(schedule => schedule.date.gte(target.from))
                      .where(schedule => schedule.date.lte(target.to));
        if (isPublished) {
            schedules = schedules.where(schedule => schedule.scheduleMenus.some(link => link.isPrimary.eq(true)));
        }
        return await schedules.updateAndCount({ isPublished });
    } catch (cause) {
        throw new CatalogRepositoryFailureError("setSchedulesPublished", cause);
    }
}

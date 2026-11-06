import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { getForeignKeyViolationConstraint } from "../../../../../infrastructure/database/prisma/sql-errors.js";
import { CatalogRepositoryFailureError, ScheduleInUseError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function deleteSchedules(this: PrismaCatalogRepository, ids: readonly string[]): Promise<number> {
    if (ids.length === 0) return 0;

    try {
        return await this.db.orm.public.Schedule.where(schedule =>
            schedule.id.in(ids as Varchar<36>[]),
        ).deleteAndCount();
    } catch (cause) {
        if (getForeignKeyViolationConstraint(cause) === "order_menu_schedule_id_fkey") {
            throw new ScheduleInUseError({ cause });
        }
        throw new CatalogRepositoryFailureError("deleteSchedules", cause);
    }
}

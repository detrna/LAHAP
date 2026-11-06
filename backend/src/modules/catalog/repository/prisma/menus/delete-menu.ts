import { getForeignKeyViolationConstraint } from "../../../../../infrastructure/database/prisma/sql-errors.js";
import { CatalogRepositoryFailureError, MenuInUseError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function deleteMenu(this: PrismaCatalogRepository, id: string): Promise<boolean> {
    try {
        return (await this.db.orm.public.Menu.where({ id }).deleteAndCount()) > 0;
    } catch (cause) {
        if (getForeignKeyViolationConstraint(cause) === "schedule_menu_menu_id_fkey") {
            throw new MenuInUseError(id, { cause });
        }
        throw new CatalogRepositoryFailureError("deleteMenu", cause);
    }
}

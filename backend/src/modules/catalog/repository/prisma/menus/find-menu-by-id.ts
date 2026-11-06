import type { MenuRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { menusWithIngredients } from "./queries.js";
import { toMenuRecord } from "./to-menu-record.js";

export async function findMenuById(this: PrismaCatalogRepository, id: string): Promise<MenuRecord | null> {
    try {
        const row = await menusWithIngredients(this.db.orm).where({ id }).first();
        return row === null ? null : toMenuRecord(row);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findMenuById", cause);
    }
}

import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { MenuRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { menusWithRelations } from "./queries.js";
import { toMenuRecord } from "./to-menu-record.js";

export async function findMenusByIds(
    this: PrismaCatalogRepository,
    ids: readonly string[],
): Promise<readonly MenuRecord[]> {
    if (ids.length === 0) return [];

    try {
        const rows = await menusWithRelations(this.db.orm)
            .where(menu => menu.id.in(ids as Varchar<36>[]))
            .orderBy([menu => menu.name.asc(), menu => menu.id.asc()])
            .all();
        return rows.map(toMenuRecord);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findMenusByIds", cause);
    }
}

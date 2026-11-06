import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { MenuKindRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function findMenuKinds(
    this: PrismaCatalogRepository,
    ids: readonly string[],
): Promise<readonly MenuKindRecord[]> {
    if (ids.length === 0) return [];

    try {
        return await this.db.orm.public.Menu.where(menu => menu.id.in(ids as Varchar<36>[]))
            .select("id", "isAlternative")
            .all();
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findMenuKinds", cause);
    }
}

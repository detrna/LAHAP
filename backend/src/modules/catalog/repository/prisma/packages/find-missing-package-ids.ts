import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function findMissingPackageIds(
    this: PrismaCatalogRepository,
    ids: readonly string[],
): Promise<readonly string[]> {
    if (ids.length === 0) return [];

    try {
        const found = await this.db.orm.public.Package.where(item => item.id.in(ids as Varchar<36>[]))
            .select("id")
            .all();
        const foundIds = new Set<string>(found.map(item => item.id));
        return ids.filter(id => !foundIds.has(id));
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findMissingPackageIds", cause);
    }
}

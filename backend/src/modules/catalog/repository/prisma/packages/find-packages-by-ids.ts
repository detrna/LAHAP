import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { PackageRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toPackageRecord } from "./to-package-record.js";

export async function findPackagesByIds(
    this: PrismaCatalogRepository,
    ids: readonly string[],
): Promise<readonly PackageRecord[]> {
    if (ids.length === 0) return [];

    try {
        const rows = await this.db.orm.public.Package.where(item => item.id.in(ids as Varchar<36>[]))
            .orderBy([item => item.name.asc(), item => item.id.asc()])
            .all();
        return rows.map(toPackageRecord);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findPackagesByIds", cause);
    }
}

import type { PackageRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { matchingPackages } from "./list-packages.js";
import { toPackageRecord } from "./to-package-record.js";

export async function findAvailablePackages(
    this: PrismaCatalogRepository,
    at: Temporal.PlainDateTime,
): Promise<readonly PackageRecord[]> {
    try {
        const rows = await matchingPackages(this.db.orm, { availableAt: at })
            .orderBy([item => item.name.asc(), item => item.id.asc()])
            .all();
        return rows.map(toPackageRecord);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findAvailablePackages", cause);
    }
}

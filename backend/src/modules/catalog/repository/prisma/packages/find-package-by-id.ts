import type { PackageRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toPackageRecord } from "./to-package-record.js";

export async function findPackageById(this: PrismaCatalogRepository, id: string): Promise<PackageRecord | null> {
    try {
        const row = await this.db.orm.public.Package.where({ id }).first();
        return row === null ? null : toPackageRecord(row);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findPackageById", cause);
    }
}

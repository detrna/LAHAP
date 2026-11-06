import { getForeignKeyViolationConstraint } from "../../../../../infrastructure/database/prisma/sql-errors.js";
import { CatalogRepositoryFailureError, PackageInUseError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function deletePackage(this: PrismaCatalogRepository, id: string): Promise<boolean> {
    try {
        return (await this.db.orm.public.Package.where({ id }).deleteAndCount()) > 0;
    } catch (cause) {
        if (getForeignKeyViolationConstraint(cause) === "subscription_package_id_fkey") {
            throw new PackageInUseError(id, { cause });
        }
        throw new CatalogRepositoryFailureError("deletePackage", cause);
    }
}

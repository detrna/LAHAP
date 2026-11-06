import type { Package } from "../../domain/package.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";

export async function getPackage(this: CatalogService, id: string): Promise<Package> {
    const record = await this.catalogRepository.findPackageById(id);
    if (record === null) throw new PackageNotFoundError(id);
    return this.presentPackage(record, { withSubscriberCount: true });
}

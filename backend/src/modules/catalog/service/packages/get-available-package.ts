import type { Package } from "../../domain/package.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";

export async function getAvailablePackage(this: CatalogService, id: string): Promise<Package> {
    const record = await this.catalogRepository.findPackageById(id);
    if (record === null) throw new PackageNotFoundError(id);
    const item = await this.presentPackage(record, { withSubscriberCount: false });
    if (!item.isAvailable) throw new PackageNotFoundError(id);
    return item;
}

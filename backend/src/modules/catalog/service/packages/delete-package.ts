import type { CatalogService } from "../catalog.service.js";
import { PackageNotFoundError } from "../interfaces/catalog.repository.js";

export async function deletePackage(this: CatalogService, id: string): Promise<void> {
    if (!(await this.catalogRepository.deletePackage(id))) throw new PackageNotFoundError(id);
}

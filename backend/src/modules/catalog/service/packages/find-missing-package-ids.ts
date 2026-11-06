import type { CatalogService } from "../catalog.service.js";

export async function findMissingPackageIds(this: CatalogService, ids: readonly string[]): Promise<readonly string[]> {
    if (ids.length === 0) return [];
    return this.catalogRepository.findMissingPackageIds([...new Set(ids)]);
}

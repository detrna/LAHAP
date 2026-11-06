import type { CatalogService } from "../catalog.service.js";

export async function findMissingScheduleIds(this: CatalogService, ids: readonly string[]): Promise<readonly string[]> {
    if (ids.length === 0) return [];
    return this.catalogRepository.findMissingScheduleIds([...new Set(ids)]);
}

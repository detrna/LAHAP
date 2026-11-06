import type { Package } from "../../domain/package.domain.js";
import type { CatalogService } from "../catalog.service.js";

export async function getPackagesByIds(this: CatalogService, ids: readonly string[]): Promise<readonly Package[]> {
    if (ids.length === 0) return [];
    const records = await this.catalogRepository.findPackagesByIds([...new Set(ids)]);
    return this.presentPackages(records, { withSubscriberCount: false });
}

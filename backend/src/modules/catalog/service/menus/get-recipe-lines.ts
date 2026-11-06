import type { RecipeLine } from "../../domain/menu.domain.js";
import type { CatalogService } from "../catalog.service.js";

export async function getRecipeLines(this: CatalogService, menuIds: readonly string[]): Promise<readonly RecipeLine[]> {
    if (menuIds.length === 0) return [];
    return this.catalogRepository.findRecipeLines([...new Set(menuIds)]);
}

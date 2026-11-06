import type { MenuIngredientUsage } from "../../domain/menu.domain.js";
import type { CatalogService } from "../catalog.service.js";

export async function findMenusUsingIngredients(
    this: CatalogService,
    ingredientIds: readonly string[],
): Promise<readonly MenuIngredientUsage[]> {
    if (ingredientIds.length === 0) return [];
    return this.catalogRepository.findMenusUsingIngredients([...new Set(ingredientIds)]);
}

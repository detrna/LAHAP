import type { IngredientsService } from "./ingredients.service.js";

export async function findMissingIngredientIds(
    this: IngredientsService,
    ids: readonly string[],
): Promise<readonly string[]> {
    if (ids.length === 0) return [];
    return this.ingredientsRepository.findMissingIds([...new Set(ids)]);
}

import type { Ingredient } from "../domain/ingredient.domain.js";
import type { IngredientsService } from "./ingredients.service.js";

export async function getIngredientsByIds(
    this: IngredientsService,
    ids: readonly string[],
): Promise<readonly Ingredient[]> {
    if (ids.length === 0) return [];
    const records = await this.ingredientsRepository.findByIds([...new Set(ids)]);
    return this.presentIngredients(records);
}

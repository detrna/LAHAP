import type { IngredientsService } from "./ingredients.service.js";

export interface IngredientAllergyIds {
    readonly ingredientId: string;
    readonly allergyIds: readonly string[];
}

export async function getAllergyIdsByIngredientIds(
    this: IngredientsService,
    ids: readonly string[],
): Promise<readonly IngredientAllergyIds[]> {
    if (ids.length === 0) return [];
    const records = await this.ingredientsRepository.findByIds([...new Set(ids)]);
    return records.map(record => ({ ingredientId: record.id, allergyIds: record.allergyIds }));
}

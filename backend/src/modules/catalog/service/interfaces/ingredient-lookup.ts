import type { Ingredient } from "../../../ingredients/domain/ingredient.domain.js";

export interface IngredientLookup {
    findMissingIngredientIds(ids: readonly string[]): Promise<readonly string[]>;
    getIngredientsByIds(ids: readonly string[]): Promise<readonly Ingredient[]>;
}

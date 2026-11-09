import type { Ingredient } from "../../../ingredients/domain/ingredient.domain.js";

export interface IngredientAllergyLink {
    readonly ingredientId: string;
    readonly allergyIds: readonly string[];
}

export interface IngredientLookup {
    findMissingIngredientIds(ids: readonly string[]): Promise<readonly string[]>;
    getIngredientsByIds(ids: readonly string[]): Promise<readonly Ingredient[]>;
    getAllergyIdsByIngredientIds(ids: readonly string[]): Promise<readonly IngredientAllergyLink[]>;
}

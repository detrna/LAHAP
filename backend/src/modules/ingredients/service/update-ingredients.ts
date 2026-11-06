import type { Ingredient } from "../domain/ingredient.domain.js";
import { applyIngredientUpdates } from "./apply-ingredient-updates.js";
import type { IngredientsService } from "./ingredients.service.js";
import type { UpdateIngredientInput } from "./update-ingredient.js";

export interface BatchUpdateIngredientInput extends UpdateIngredientInput {
    readonly id: string;
}

export async function updateIngredients(
    this: IngredientsService,
    inputs: readonly BatchUpdateIngredientInput[],
): Promise<Ingredient[]> {
    return applyIngredientUpdates.call(
        this,
        inputs.map(({ id, ...changes }) => ({ id, changes })),
        index => `items.${index}.photoKey`,
    );
}

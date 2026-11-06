import type { RecipeLineInput } from "../../domain/recipe.js";
import type { IngredientLookup } from "../interfaces/ingredient-lookup.js";
import { UnknownIngredientError } from "../interfaces/catalog.repository.js";

export async function ensureKnownIngredients(
    ingredients: IngredientLookup,
    lines: readonly RecipeLineInput[],
): Promise<void> {
    const missing = await ingredients.findMissingIngredientIds([...new Set(lines.map(line => line.ingredientId))]);
    if (missing.length > 0) throw new UnknownIngredientError(missing);
}

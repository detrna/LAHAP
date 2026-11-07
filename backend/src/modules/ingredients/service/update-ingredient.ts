import type { Ingredient, IngredientUnit } from "../domain/ingredient.domain.js";
import { applyIngredientUpdates } from "./apply-ingredient-updates.js";
import type { IngredientsService } from "./ingredients.service.js";

export interface UpdateIngredientInput {
    readonly name?: string | undefined;
    readonly unit?: IngredientUnit | undefined;
    readonly stock?: number | undefined;
    readonly minimumThreshold?: number | undefined;
    readonly photoKey?: string | undefined;
    readonly allergyIds?: readonly string[] | undefined;
}

export async function updateIngredient(
    this: IngredientsService,
    id: string,
    input: UpdateIngredientInput,
    actorId: string,
): Promise<Ingredient> {
    const [item] = await applyIngredientUpdates.call(this, [{ id, changes: input }], actorId, () => "photoKey");
    if (item === undefined) throw new Error(`ingredient ${id} missing from its own update result`);
    return item;
}

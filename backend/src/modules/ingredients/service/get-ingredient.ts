import type { Ingredient } from "../domain/ingredient.domain.js";
import type { IngredientsService } from "./ingredients.service.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

export async function getIngredient(this: IngredientsService, id: string): Promise<Ingredient> {
    const record = await this.ingredientsRepository.findById(id);
    if (record === null) throw new IngredientNotFoundError(id);
    return this.presentIngredient(record);
}

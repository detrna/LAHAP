import type { Ingredient } from "../domain/ingredient.domain.js";
import type { IngredientsService } from "./ingredients.service.js";

export async function updateStock(
    this: IngredientsService,
    id: string,
    stock: number,
    actorId: string,
): Promise<Ingredient> {
    return this.updateIngredient(id, { stock }, actorId);
}

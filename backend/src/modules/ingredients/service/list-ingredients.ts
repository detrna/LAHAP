import type { Ingredient } from "../domain/ingredient.domain.js";
import type { IngredientsService } from "./ingredients.service.js";

export interface ListIngredientsInput {
    readonly search?: string | undefined;
    readonly lowStock?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface IngredientPage {
    readonly items: readonly Ingredient[];
    readonly total: number;
}

export async function listIngredients(this: IngredientsService, input: ListIngredientsInput): Promise<IngredientPage> {
    const { items, total } = await this.ingredientsRepository.list(input);
    return { items: await this.presentIngredients(items), total };
}

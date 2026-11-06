import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";
import type { IngredientUnit, ShoppingListItem } from "./ingredient.domain.js";

export interface ShoppingListStock {
    readonly id: string;
    readonly name: string;
    readonly unit: IngredientUnit;
    readonly stock: number;
}

const QUANTITY_SCALE = 2;

export function buildShoppingList(
    requirements: ReadonlyMap<string, number>,
    ingredients: readonly ShoppingListStock[],
): ShoppingListItem[] {
    const items: ShoppingListItem[] = [];
    for (const ingredient of ingredients) {
        const requiredQuantity = requirements.get(ingredient.id);
        if (requiredQuantity === undefined) continue;
        const shortageQuantity = roundHalfUp(Math.max(0, requiredQuantity - ingredient.stock), QUANTITY_SCALE);
        if (shortageQuantity <= 0) continue;
        items.push({
            ingredientId: ingredient.id,
            name: ingredient.name,
            unit: ingredient.unit,
            requiredQuantity,
            currentStock: ingredient.stock,
            shortageQuantity,
        });
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
}

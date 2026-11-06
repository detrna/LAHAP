import { roundHalfUp } from "../decimal/decimal.js";

export interface RecipeLineInput {
    readonly menuId: string;
    readonly ingredientId: string;
    readonly quantityPerPortion: number;
}

const QUANTITY_SCALE = 2;

export function sumIngredientRequirements(
    portionsByMenu: ReadonlyMap<string, number>,
    recipeLines: readonly RecipeLineInput[],
): ReadonlyMap<string, number> {
    const totals = new Map<string, number>();
    for (const line of recipeLines) {
        const portions = portionsByMenu.get(line.menuId);
        if (portions === undefined) continue;
        totals.set(line.ingredientId, (totals.get(line.ingredientId) ?? 0) + portions * line.quantityPerPortion);
    }
    return new Map([...totals].map(([ingredientId, total]) => [ingredientId, roundHalfUp(total, QUANTITY_SCALE)]));
}

import { sumIngredientRequirements } from "../../../shared/utils/ingredient-requirements/ingredient-requirements.js";
import type { Menu } from "../../catalog/domain/menu.domain.js";
import type { ToCookIngredient } from "./to-cook.domain.js";
import type { ServedSlot } from "./to-cook-source.js";

export function buildToCookIngredients(
    served: readonly ServedSlot[],
    menus: ReadonlyMap<string, Menu>,
): readonly ToCookIngredient[] {
    const portionsByMenu = new Map<string, number>();
    for (const { servedMenuId } of served) {
        if (menus.has(servedMenuId)) portionsByMenu.set(servedMenuId, (portionsByMenu.get(servedMenuId) ?? 0) + 1);
    }

    const details = new Map<string, Pick<ToCookIngredient, "name" | "unit">>();
    const recipeLines = [...portionsByMenu.keys()].flatMap(menuId =>
        (menus.get(menuId)?.ingredients ?? []).flatMap(line => {
            if (line.ingredient === undefined) return [];
            details.set(line.ingredientId, { name: line.ingredient.name, unit: line.ingredient.unit });
            return [{ menuId, ingredientId: line.ingredientId, quantityPerPortion: line.quantityPerPortion }];
        }),
    );

    const totals = sumIngredientRequirements(portionsByMenu, recipeLines);
    return [...totals]
        .flatMap(([ingredientId, totalQuantity]) => {
            const detail = details.get(ingredientId);
            return detail === undefined ? [] : [{ ingredientId, ...detail, totalQuantity }];
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

import { toPhotoUrls } from "../../../../shared/media/photo.js";
import type { Ingredient } from "../../../ingredients/domain/ingredient.domain.js";
import type { UserSummary } from "../../../users/domain/user.domain.js";
import { distinctCookIds } from "../../domain/menu-components.js";
import { unionAllergies } from "../../domain/menu-allergies.js";
import type { Menu } from "../../domain/menu.domain.js";
import type { CatalogService } from "../catalog.service.js";
import type { MenuRecord } from "../interfaces/catalog.repository.js";
import { MenuNotFoundError } from "../interfaces/catalog.repository.js";
import { toMenu } from "./to-menu.js";

export interface PresentMenusOptions {
    readonly withIngredients: boolean;
}

export async function presentMenus(
    this: CatalogService,
    records: readonly MenuRecord[],
    { withIngredients }: PresentMenusOptions,
): Promise<Menu[]> {
    if (records.length === 0) return [];

    const ingredientIds = [...new Set(records.flatMap(record => record.ingredients.map(line => line.ingredientId)))];
    const cookIds = distinctCookIds(records.flatMap(record => record.components));
    const [ingredients, cooks, photoUrls] = await Promise.all([
        ingredientIds.length > 0 ? this.ingredients.getIngredientsByIds(ingredientIds) : [],
        cookIds.length > 0 ? this.cooks.getSummaries(cookIds) : [],
        toPhotoUrls(
            this.objectStorage,
            records.map(record => record.photoKey),
        ),
    ]);
    const ingredientById = new Map<string, Ingredient>(ingredients.map(ingredient => [ingredient.id, ingredient]));
    const cookById = new Map<string, UserSummary>(cooks.map(cook => [cook.id, cook]));

    return records.map((record, index) => {
        const used = record.ingredients.flatMap(line => {
            const ingredient = ingredientById.get(line.ingredientId);
            return ingredient === undefined ? [] : [ingredient];
        });
        return toMenu(record, {
            photoUrl: photoUrls[index] ?? "",
            allergies: unionAllergies(used),
            components: record.components.map(component => ({
                id: component.id,
                name: component.name,
                cookId: component.cookId,
                cook: component.cookId === null ? null : (cookById.get(component.cookId) ?? null),
            })),
            ...(withIngredients
                ? {
                      ingredients: record.ingredients.map(line => ({
                          ingredientId: line.ingredientId,
                          quantityPerPortion: line.quantityPerPortion,
                          ...(ingredientById.has(line.ingredientId)
                              ? { ingredient: ingredientById.get(line.ingredientId) }
                              : {}),
                      })),
                  }
                : {}),
        });
    });
}

export async function presentMenu(this: CatalogService, record: MenuRecord): Promise<Menu> {
    const [item] = await this.presentMenus([record], { withIngredients: true });
    if (item === undefined) throw new MenuNotFoundError(record.id);
    return item;
}

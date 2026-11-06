import { toPhotoUrls } from "../../../../shared/media/photo.js";
import type { Ingredient } from "../../../ingredients/domain/ingredient.domain.js";
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
    const [ingredients, photoUrls] = await Promise.all([
        ingredientIds.length > 0 ? this.ingredients.getIngredientsByIds(ingredientIds) : [],
        toPhotoUrls(
            this.objectStorage,
            records.map(record => record.photoKey),
        ),
    ]);
    const ingredientById = new Map<string, Ingredient>(ingredients.map(ingredient => [ingredient.id, ingredient]));

    return records.map((record, index) => {
        const used = record.ingredients.flatMap(line => {
            const ingredient = ingredientById.get(line.ingredientId);
            return ingredient === undefined ? [] : [ingredient];
        });
        return toMenu(record, {
            photoUrl: photoUrls[index] ?? "",
            allergies: unionAllergies(used),
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

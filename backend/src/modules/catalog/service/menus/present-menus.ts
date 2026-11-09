import { toPhotoUrls } from "../../../../shared/media/photo.js";
import type { Ingredient } from "../../../ingredients/domain/ingredient.domain.js";
import type { Allergy } from "../../domain/allergy.domain.js";
import { distinctCookIds } from "../../domain/menu-components.js";
import { unionAllergies } from "../../domain/menu-allergies.js";
import type { Menu, MenuAudience, MenuComponent, MenuCook } from "../../domain/menu.domain.js";
import type { CatalogService } from "../catalog.service.js";
import type { MenuComponentRecord, MenuRecord } from "../interfaces/catalog.repository.js";
import { MenuNotFoundError } from "../interfaces/catalog.repository.js";
import { toMenu } from "./to-menu.js";

export interface PresentMenusOptions {
    readonly withIngredients: boolean;
    readonly withCooks: boolean;
}

export const MENU_VIEWS: Readonly<Record<MenuAudience, PresentMenusOptions>> = {
    staff: { withIngredients: true, withCooks: true },
    customer: { withIngredients: false, withCooks: false },
};

interface IngredientDetails {
    readonly allergiesById: ReadonlyMap<string, readonly Allergy[]>;
    readonly ingredientById: ReadonlyMap<string, Ingredient>;
}

async function loadIngredientDetails(
    service: CatalogService,
    ids: readonly string[],
    withIngredients: boolean,
): Promise<IngredientDetails> {
    if (ids.length === 0) return { allergiesById: new Map(), ingredientById: new Map() };
    if (withIngredients) {
        const ingredients = await service.ingredients.getIngredientsByIds(ids);
        return {
            allergiesById: new Map(ingredients.map(ingredient => [ingredient.id, ingredient.allergies ?? []])),
            ingredientById: new Map(ingredients.map(ingredient => [ingredient.id, ingredient])),
        };
    }
    const links = await service.ingredients.getAllergyIdsByIngredientIds(ids);
    const allergies = await service.getAllergiesByIds([...new Set(links.flatMap(link => link.allergyIds))]);
    const allergyById = new Map(allergies.map(allergy => [allergy.id, allergy]));
    return {
        allergiesById: new Map(
            links.map(link => [
                link.ingredientId,
                link.allergyIds.flatMap(id => {
                    const allergy = allergyById.get(id);
                    return allergy === undefined ? [] : [allergy];
                }),
            ]),
        ),
        ingredientById: new Map(),
    };
}

async function loadCooks(
    service: CatalogService,
    components: readonly MenuComponentRecord[],
): Promise<ReadonlyMap<string, MenuCook>> {
    const ids = distinctCookIds(components);
    if (ids.length === 0) return new Map();
    const cooks = await service.cooks.getSummaries(ids);
    return new Map(cooks.map(({ id, name }) => [id, { id, name }]));
}

function toComponent(component: MenuComponentRecord, cookById: ReadonlyMap<string, MenuCook> | null): MenuComponent {
    if (cookById === null) return { id: component.id, name: component.name };
    return {
        id: component.id,
        name: component.name,
        cook: component.cookId === null ? null : (cookById.get(component.cookId) ?? null),
    };
}

export async function presentMenus(
    this: CatalogService,
    records: readonly MenuRecord[],
    { withIngredients, withCooks }: PresentMenusOptions,
): Promise<Menu[]> {
    if (records.length === 0) return [];

    const ingredientIds = [...new Set(records.flatMap(record => record.ingredients.map(line => line.ingredientId)))];
    const [{ allergiesById, ingredientById }, cookById, photoUrls] = await Promise.all([
        loadIngredientDetails(this, ingredientIds, withIngredients),
        withCooks
            ? loadCooks(
                  this,
                  records.flatMap(record => record.components),
              )
            : null,
        toPhotoUrls(
            this.objectStorage,
            records.map(record => record.photoKey),
        ),
    ]);

    return records.map((record, index) => {
        const used = record.ingredients.flatMap(line => {
            const allergies = allergiesById.get(line.ingredientId);
            return allergies === undefined ? [] : [{ allergies }];
        });
        return toMenu(record, {
            photoUrl: photoUrls[index] ?? "",
            allergies: unionAllergies(used),
            components: record.components.map(component => toComponent(component, cookById)),
            ...(withIngredients
                ? {
                      ingredients: record.ingredients.map(line => {
                          const ingredient = ingredientById.get(line.ingredientId);
                          return {
                              ingredientId: line.ingredientId,
                              quantityPerPortion: line.quantityPerPortion,
                              ...(ingredient !== undefined ? { ingredient } : {}),
                          };
                      }),
                  }
                : {}),
        });
    });
}

export async function presentMenu(this: CatalogService, record: MenuRecord): Promise<Menu> {
    const [item] = await this.presentMenus([record], MENU_VIEWS.staff);
    if (item === undefined) throw new MenuNotFoundError(record.id);
    return item;
}

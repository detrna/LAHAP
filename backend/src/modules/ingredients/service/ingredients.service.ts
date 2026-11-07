import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import { createIngredients } from "./create-ingredients.js";
import { deleteIngredients } from "./delete-ingredients.js";
import { findMissingIngredientIds } from "./find-missing-ingredient-ids.js";
import { getIngredient } from "./get-ingredient.js";
import { getIngredientsByIds } from "./get-ingredients-by-ids.js";
import { getShoppingList } from "./get-shopping-list.js";
import type { AllergyLookup } from "./interfaces/allergy-lookup.js";
import type { IngredientsRepository } from "./interfaces/ingredients.repository.js";
import type { MenuLookup } from "./interfaces/menu-lookup.js";
import type { PhotoKeys } from "./interfaces/photo-keys.js";
import type { PortionCounts } from "./interfaces/portion-counts.js";
import { listIngredients } from "./list-ingredients.js";
import { presentIngredient, presentIngredients } from "./present-ingredients.js";
import { updateIngredient } from "./update-ingredient.js";
import { updateIngredients } from "./update-ingredients.js";
import { updateStock } from "./update-stock.js";

export interface IngredientsServiceDeps {
    readonly objectStorage: ObjectStorage;
    readonly photoKeys: PhotoKeys;
    readonly allergies: AllergyLookup;
    readonly clock: Clock;
    readonly menus: MenuLookup;
    readonly portions: PortionCounts;
}

export class IngredientsService {
    readonly objectStorage: ObjectStorage;
    readonly photoKeys: PhotoKeys;
    readonly allergies: AllergyLookup;
    readonly clock: Clock;
    readonly menus: MenuLookup;
    readonly portions: PortionCounts;

    constructor(
        readonly ingredientsRepository: IngredientsRepository,
        deps: IngredientsServiceDeps,
    ) {
        this.objectStorage = deps.objectStorage;
        this.photoKeys = deps.photoKeys;
        this.allergies = deps.allergies;
        this.clock = deps.clock;
        this.menus = deps.menus;
        this.portions = deps.portions;
    }

    presentIngredients = presentIngredients;
    presentIngredient = presentIngredient;
    listIngredients = listIngredients;
    getIngredient = getIngredient;
    createIngredients = createIngredients;
    updateIngredients = updateIngredients;
    updateIngredient = updateIngredient;
    updateStock = updateStock;
    deleteIngredients = deleteIngredients;
    getIngredientsByIds = getIngredientsByIds;
    findMissingIngredientIds = findMissingIngredientIds;
    getShoppingList = getShoppingList;
}

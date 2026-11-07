import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { ObjectStorage } from "../../../shared/ports/object-storage/object-storage.js";
import type { StockLevelEstimator } from "../../../shared/ports/stock-level-estimator/stock-level-estimator.js";
import { createIngredients } from "./create-ingredients.js";
import { deleteIngredients } from "./delete-ingredients.js";
import { estimateStock } from "./estimate-stock.js";
import { findMissingIngredientIds } from "./find-missing-ingredient-ids.js";
import { getIngredient } from "./get-ingredient.js";
import { getIngredientsByIds } from "./get-ingredients-by-ids.js";
import { getShoppingList } from "./get-shopping-list.js";
import type { AllergyLookup } from "./interfaces/allergy-lookup.js";
import type { IngredientsRepository } from "./interfaces/ingredients.repository.js";
import type { MenuLookup } from "./interfaces/menu-lookup.js";
import type { PhotoKeys } from "./interfaces/photo-keys.js";
import type { PortionCounts } from "./interfaces/portion-counts.js";
import type { UserDirectory } from "./interfaces/user-directory.js";
import { listIngredients } from "./list-ingredients.js";
import { listStockHistory } from "./list-stock-history.js";
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
    readonly stockLevelEstimator: StockLevelEstimator;
    readonly users: UserDirectory;
}

export class IngredientsService {
    readonly objectStorage: ObjectStorage;
    readonly photoKeys: PhotoKeys;
    readonly allergies: AllergyLookup;
    readonly clock: Clock;
    readonly menus: MenuLookup;
    readonly portions: PortionCounts;
    readonly stockLevelEstimator: StockLevelEstimator;
    readonly users: UserDirectory;

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
        this.stockLevelEstimator = deps.stockLevelEstimator;
        this.users = deps.users;
    }

    presentIngredients = presentIngredients;
    presentIngredient = presentIngredient;
    listIngredients = listIngredients;
    listStockHistory = listStockHistory;
    getIngredient = getIngredient;
    createIngredients = createIngredients;
    updateIngredients = updateIngredients;
    updateIngredient = updateIngredient;
    updateStock = updateStock;
    deleteIngredients = deleteIngredients;
    getIngredientsByIds = getIngredientsByIds;
    findMissingIngredientIds = findMissingIngredientIds;
    getShoppingList = getShoppingList;
    estimateStock = estimateStock;
}

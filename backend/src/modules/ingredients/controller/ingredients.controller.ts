import type { IngredientsService } from "../service/ingredients.service.js";
import { createIngredients } from "./create-ingredients.js";
import { deleteIngredients } from "./delete-ingredients.js";
import { getIngredient } from "./get-ingredient.js";
import { listIngredients } from "./list-ingredients.js";
import { updateIngredient } from "./update-ingredient.js";
import { updateIngredients } from "./update-ingredients.js";
import { updateStock } from "./update-stock.js";

export class IngredientsController {
    constructor(readonly ingredientsService: IngredientsService) {}

    listIngredients = listIngredients.bind(this);
    getIngredient = getIngredient.bind(this);
    createIngredients = createIngredients.bind(this);
    updateIngredients = updateIngredients.bind(this);
    updateIngredient = updateIngredient.bind(this);
    deleteIngredients = deleteIngredients.bind(this);
    updateStock = updateStock.bind(this);
}

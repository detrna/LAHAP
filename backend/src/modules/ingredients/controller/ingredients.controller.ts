import type { IngredientsService } from "../service/ingredients.service.js";

export class IngredientsController {
    constructor(readonly ingredientsService: IngredientsService) {}
}

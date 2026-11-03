import type { IngredientsRepository } from "./interfaces/ingredients.repository.js";

export class IngredientsService {
    constructor(readonly ingredientsRepository: IngredientsRepository) {}
}

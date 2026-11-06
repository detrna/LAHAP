import type { IngredientRecord } from "../../service/interfaces/ingredients.repository.js";
import { IngredientsRepositoryFailureError } from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";
import { ingredientsWithAllergyIds } from "./queries.js";
import { toIngredientRecord } from "./to-ingredient-record.js";

export async function findById(this: PrismaIngredientsRepository, id: string): Promise<IngredientRecord | null> {
    try {
        const row = await ingredientsWithAllergyIds(this.db.orm).where({ id }).first();
        return row === null ? null : toIngredientRecord(row);
    } catch (cause) {
        throw new IngredientsRepositoryFailureError("findById", cause);
    }
}

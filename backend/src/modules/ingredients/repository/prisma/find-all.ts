import type { IngredientRecord } from "../../service/interfaces/ingredients.repository.js";
import { IngredientsRepositoryFailureError } from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";
import { ingredientsWithAllergyIds } from "./queries.js";
import { toIngredientRecord } from "./to-ingredient-record.js";

export async function findAll(this: PrismaIngredientsRepository): Promise<readonly IngredientRecord[]> {
    try {
        const rows = await ingredientsWithAllergyIds(this.db.orm)
            .orderBy([item => item.name.asc(), item => item.id.asc()])
            .all();
        return rows.map(toIngredientRecord);
    } catch (cause) {
        throw new IngredientsRepositoryFailureError("findAll", cause);
    }
}

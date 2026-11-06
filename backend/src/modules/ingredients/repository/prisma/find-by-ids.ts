import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { IngredientRecord } from "../../service/interfaces/ingredients.repository.js";
import { IngredientsRepositoryFailureError } from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";
import { ingredientsWithAllergyIds } from "./queries.js";
import { toIngredientRecord } from "./to-ingredient-record.js";

export async function findByIds(
    this: PrismaIngredientsRepository,
    ids: readonly string[],
): Promise<readonly IngredientRecord[]> {
    if (ids.length === 0) return [];

    try {
        const rows = await ingredientsWithAllergyIds(this.db.orm)
            .where(item => item.id.in(ids as Varchar<36>[]))
            .orderBy([item => item.name.asc(), item => item.id.asc()])
            .all();
        return rows.map(toIngredientRecord);
    } catch (cause) {
        throw new IngredientsRepositoryFailureError("findByIds", cause);
    }
}

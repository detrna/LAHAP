import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import { toContainsPattern } from "../../../../infrastructure/database/prisma/like.js";
import type { IngredientListQuery, IngredientListRecord } from "../../service/interfaces/ingredients.repository.js";
import { IngredientsRepositoryFailureError } from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";
import { toIngredientRecord } from "./to-ingredient-record.js";

function matchingIngredients(orm: Db["orm"], query: IngredientListQuery) {
    let ingredients = orm.public.Ingredient;

    if (query.search !== undefined) {
        const pattern = toContainsPattern(query.search);
        ingredients = ingredients.where(item => item.name.ilike(pattern));
    }
    if (query.lowStock !== undefined) {
        const { lowStock } = query;
        ingredients = ingredients.where(item =>
            lowStock ? item.stock.lte(item.minimumThreshold) : item.stock.gt(item.minimumThreshold),
        );
    }

    return ingredients;
}

export async function list(
    this: PrismaIngredientsRepository,
    query: IngredientListQuery,
): Promise<IngredientListRecord> {
    try {
        const [rows, totals] = await Promise.all([
            matchingIngredients(this.db.orm, query)
                .include("ingredientAllergy", link => link.select("allergyId"))
                .orderBy([item => item.name.asc(), item => item.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matchingIngredients(this.db.orm, query).aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toIngredientRecord), total: totals.total };
    } catch (cause) {
        throw new IngredientsRepositoryFailureError("list", cause);
    }
}

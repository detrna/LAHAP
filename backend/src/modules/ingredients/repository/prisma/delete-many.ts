import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { getForeignKeyViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import {
    IngredientInUseError,
    IngredientNotFoundError,
    IngredientsRepositoryFailureError,
} from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";

export async function deleteMany(this: PrismaIngredientsRepository, ids: readonly string[]): Promise<number> {
    if (ids.length === 0) return 0;

    try {
        return await this.db.transaction(async tx => {
            const found = await tx.orm.public.Ingredient.where(item => item.id.in(ids as Varchar<36>[]))
                .select("id")
                .all();
            const foundIds = new Set<string>(found.map(item => item.id));
            const missing = ids.find(id => !foundIds.has(id));
            if (missing !== undefined) throw new IngredientNotFoundError(missing);

            return tx.orm.public.Ingredient.where(item => item.id.in(ids as Varchar<36>[])).deleteAndCount();
        });
    } catch (cause) {
        if (cause instanceof IngredientNotFoundError) throw cause;
        if (getForeignKeyViolationConstraint(cause) === "menu_ingredient_ingredient_id_fkey") {
            throw new IngredientInUseError({ cause });
        }
        throw new IngredientsRepositoryFailureError("deleteMany", cause);
    }
}

import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { IngredientsRepositoryFailureError } from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";

export async function findMissingIds(
    this: PrismaIngredientsRepository,
    ids: readonly string[],
): Promise<readonly string[]> {
    if (ids.length === 0) return [];

    try {
        const found = await this.db.orm.public.Ingredient.where(item => item.id.in(ids as Varchar<36>[]))
            .select("id")
            .all();
        const foundIds = new Set<string>(found.map(item => item.id));
        return ids.filter(id => !foundIds.has(id));
    } catch (cause) {
        throw new IngredientsRepositoryFailureError("findMissingIds", cause);
    }
}

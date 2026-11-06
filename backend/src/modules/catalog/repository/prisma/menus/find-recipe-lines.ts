import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { fromNumeric } from "../../../../../infrastructure/database/prisma/numeric.js";
import type { RecipeLineRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function findRecipeLines(
    this: PrismaCatalogRepository,
    menuIds: readonly string[],
): Promise<readonly RecipeLineRecord[]> {
    if (menuIds.length === 0) return [];

    try {
        const rows = await this.db.orm.public.MenuIngredient.where(line => line.menuId.in(menuIds as Varchar<36>[]))
            .select("menuId", "ingredientId", "quantityPerPortion")
            .orderBy([line => line.menuId.asc(), line => line.ingredientId.asc()])
            .all();
        return rows.map(row => ({
            menuId: row.menuId,
            ingredientId: row.ingredientId,
            quantityPerPortion: fromNumeric(row.quantityPerPortion),
        }));
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findRecipeLines", cause);
    }
}

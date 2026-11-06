import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { MenuUsageRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function findMenusUsingIngredients(
    this: PrismaCatalogRepository,
    ingredientIds: readonly string[],
): Promise<readonly MenuUsageRecord[]> {
    if (ingredientIds.length === 0) return [];

    try {
        const rows = await this.db.orm.public.MenuIngredient.where(line =>
            line.ingredientId.in(ingredientIds as Varchar<36>[]),
        )
            .select("ingredientId", "menuId")
            .include("menu", menu => menu.select("name"))
            .orderBy([line => line.ingredientId.asc(), line => line.menuId.asc()])
            .all();
        return rows.map(row => ({
            ingredientId: row.ingredientId,
            menuId: row.menuId,
            menuName: row.menu?.name ?? "",
        }));
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findMenusUsingIngredients", cause);
    }
}

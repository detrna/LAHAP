import { toNumeric } from "../../../../../infrastructure/database/prisma/numeric.js";
import type { MenuChanges, MenuRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toUnknownIngredientError } from "./menu-ingredient-errors.js";
import { menusWithIngredients } from "./queries.js";
import { toMenuRecord } from "./to-menu-record.js";

function toMenuColumns(changes: MenuChanges) {
    return {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.description !== undefined ? { description: changes.description } : {}),
        ...(changes.isAlternative !== undefined ? { isAlternative: changes.isAlternative } : {}),
        ...(changes.tags !== undefined ? { tags: [...changes.tags] } : {}),
        ...(changes.photoKey !== undefined ? { photoKey: changes.photoKey } : {}),
    };
}

export async function updateMenu(
    this: PrismaCatalogRepository,
    id: string,
    changes: MenuChanges,
): Promise<MenuRecord | null> {
    try {
        return await this.db.transaction(async tx => {
            const columns = toMenuColumns(changes);
            const target = tx.orm.public.Menu.where({ id }).select("id");
            const found = Object.keys(columns).length > 0 ? await target.update(columns) : await target.first();
            if (found === null) return null;

            if (changes.ingredients !== undefined) {
                await tx.orm.public.MenuIngredient.where({ menuId: id }).deleteAndCount();
                await tx.orm.public.MenuIngredient.createAll(
                    changes.ingredients.map(line => ({
                        menuId: id,
                        ingredientId: line.ingredientId,
                        quantityPerPortion: toNumeric(line.quantityPerPortion, 2),
                    })),
                );
            }

            const row = await menusWithIngredients(tx.orm).where({ id }).first();
            return row === null ? null : toMenuRecord(row);
        });
    } catch (cause) {
        throw (
            toUnknownIngredientError(cause, changes.ingredients) ??
            new CatalogRepositoryFailureError("updateMenu", cause)
        );
    }
}

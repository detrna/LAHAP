import { toNumeric } from "../../../../../infrastructure/database/prisma/numeric.js";
import type { MenuRecord, NewMenuRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toUnknownIngredientError } from "./menu-ingredient-errors.js";
import { menusWithIngredients } from "./queries.js";
import { toMenuRecord } from "./to-menu-record.js";

export async function createMenu(this: PrismaCatalogRepository, record: NewMenuRecord): Promise<MenuRecord> {
    try {
        return await this.db.transaction(async tx => {
            const created = await tx.orm.public.Menu.create({
                name: record.name,
                description: record.description,
                isAlternative: record.isAlternative,
                tags: [...record.tags],
                photoKey: record.photoKey,
            });
            await tx.orm.public.MenuIngredient.createAll(
                record.ingredients.map(line => ({
                    menuId: created.id,
                    ingredientId: line.ingredientId,
                    quantityPerPortion: toNumeric(line.quantityPerPortion, 2),
                })),
            );
            const row = await menusWithIngredients(tx.orm).where({ id: created.id }).first();
            if (row === null) throw new Error(`menu ${created.id} vanished inside its own transaction`);
            return toMenuRecord(row);
        });
    } catch (cause) {
        throw (
            toUnknownIngredientError(cause, record.ingredients) ??
            new CatalogRepositoryFailureError("createMenu", cause)
        );
    }
}

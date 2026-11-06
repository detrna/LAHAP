import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { toNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import { getUniqueViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import type {
    IngredientChanges,
    IngredientRecord,
    IngredientUpdateRecord,
} from "../../service/interfaces/ingredients.repository.js";
import {
    IngredientAlreadyExistsError,
    IngredientNotFoundError,
    IngredientsRepositoryFailureError,
} from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";
import { ingredientsWithAllergyIds } from "./queries.js";
import { toIngredientRecord } from "./to-ingredient-record.js";

function toIngredientColumns(changes: IngredientChanges) {
    return {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.unit !== undefined ? { unit: changes.unit } : {}),
        ...(changes.stock !== undefined ? { stock: toNumeric(changes.stock, 2) } : {}),
        ...(changes.minimumThreshold !== undefined ? { minimumThreshold: toNumeric(changes.minimumThreshold, 2) } : {}),
        ...(changes.photoKey !== undefined ? { photoKey: changes.photoKey } : {}),
    };
}

export async function updateMany(
    this: PrismaIngredientsRepository,
    updates: readonly IngredientUpdateRecord[],
): Promise<readonly IngredientRecord[]> {
    let writing: IngredientUpdateRecord | undefined;

    try {
        return await this.db.transaction(async tx => {
            for (const update of updates) {
                writing = update;
                const columns = toIngredientColumns(update.changes);
                const target = tx.orm.public.Ingredient.where({ id: update.id }).select("id");
                const found = Object.keys(columns).length > 0 ? await target.update(columns) : await target.first();
                if (found === null) throw new IngredientNotFoundError(update.id);

                if (update.changes.allergyIds !== undefined) {
                    await tx.orm.public.IngredientAllergy.where({ ingredientId: update.id }).deleteAndCount();
                    if (update.changes.allergyIds.length > 0) {
                        await tx.orm.public.IngredientAllergy.createAll(
                            update.changes.allergyIds.map(allergyId => ({ ingredientId: update.id, allergyId })),
                        );
                    }
                }
            }

            const ids = updates.map(update => update.id);
            const rows = await ingredientsWithAllergyIds(tx.orm)
                .where(item => item.id.in(ids as Varchar<36>[]))
                .all();
            const recordById = new Map<string, IngredientRecord>(rows.map(row => [row.id, toIngredientRecord(row)]));
            return ids.map(id => {
                const record = recordById.get(id);
                if (record === undefined) throw new Error(`ingredient ${id} vanished inside its own transaction`);
                return record;
            });
        });
    } catch (cause) {
        if (cause instanceof IngredientNotFoundError) throw cause;
        const name = writing?.changes.name;
        if (name !== undefined && getUniqueViolationConstraint(cause) === "ingredient_name_key") {
            throw new IngredientAlreadyExistsError(name, { cause });
        }
        throw new IngredientsRepositoryFailureError("updateMany", cause);
    }
}

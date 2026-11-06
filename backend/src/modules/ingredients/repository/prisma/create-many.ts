import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { toNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import { getUniqueViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import type { IngredientRecord, NewIngredientRecord } from "../../service/interfaces/ingredients.repository.js";
import {
    IngredientAlreadyExistsError,
    IngredientsRepositoryFailureError,
} from "../../service/interfaces/ingredients.repository.js";
import type { PrismaIngredientsRepository } from "./ingredients-repository.js";
import { ingredientsWithAllergyIds } from "./queries.js";
import { toIngredientRecord } from "./to-ingredient-record.js";

export async function createMany(
    this: PrismaIngredientsRepository,
    records: readonly NewIngredientRecord[],
): Promise<readonly IngredientRecord[]> {
    let writing: NewIngredientRecord | undefined;

    try {
        return await this.db.transaction(async tx => {
            const ids: string[] = [];
            for (const record of records) {
                writing = record;
                const created = await tx.orm.public.Ingredient.create({
                    name: record.name,
                    unit: record.unit,
                    stock: toNumeric(record.stock, 2),
                    minimumThreshold: toNumeric(record.minimumThreshold, 2),
                    photoKey: record.photoKey,
                });
                if (record.allergyIds.length > 0) {
                    await tx.orm.public.IngredientAllergy.createAll(
                        record.allergyIds.map(allergyId => ({ ingredientId: created.id, allergyId })),
                    );
                }
                ids.push(created.id);
            }

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
        if (writing !== undefined && getUniqueViolationConstraint(cause) === "ingredient_name_key") {
            throw new IngredientAlreadyExistsError(writing.name, { cause });
        }
        throw new IngredientsRepositoryFailureError("createMany", cause);
    }
}

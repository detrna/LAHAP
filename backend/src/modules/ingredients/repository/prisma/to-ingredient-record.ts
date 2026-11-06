import { fromNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import { INGREDIENT_UNITS, type IngredientUnit } from "../../domain/ingredient.domain.js";
import type { IngredientRecord } from "../../service/interfaces/ingredients.repository.js";

export interface IngredientRow {
    readonly id: string;
    readonly name: string;
    readonly unit: string;
    readonly stock: string;
    readonly minimumThreshold: string;
    readonly photoKey: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
    readonly ingredientAllergy: readonly { readonly allergyId: string }[];
}

function isIngredientUnit(value: string): value is IngredientUnit {
    return (INGREDIENT_UNITS as readonly string[]).includes(value);
}

export function toIngredientRecord(row: IngredientRow): IngredientRecord {
    if (!isIngredientUnit(row.unit)) {
        throw new Error(`unknown unit "${row.unit}" on ingredient ${row.id}`);
    }

    return {
        id: row.id,
        name: row.name,
        unit: row.unit,
        stock: fromNumeric(row.stock),
        minimumThreshold: fromNumeric(row.minimumThreshold),
        photoKey: row.photoKey,
        allergyIds: row.ingredientAllergy.map(link => link.allergyId),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

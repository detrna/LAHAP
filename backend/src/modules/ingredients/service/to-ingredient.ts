import type { Allergy } from "../../catalog/domain/allergy.domain.js";
import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Ingredient } from "../domain/ingredient.domain.js";
import { isLowStock } from "../domain/low-stock.js";
import type { IngredientRecord } from "./interfaces/ingredients.repository.js";

export interface IngredientContext {
    readonly photoUrl: string;
    readonly allergies: readonly Allergy[];
}

export function toIngredient(record: IngredientRecord, context: IngredientContext): Ingredient {
    return {
        id: record.id,
        name: record.name,
        unit: record.unit,
        stock: record.stock,
        minimumThreshold: record.minimumThreshold,
        isLowStock: isLowStock(record.stock, record.minimumThreshold),
        photoKey: record.photoKey,
        photoUrl: context.photoUrl,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
        allergies: context.allergies,
    };
}

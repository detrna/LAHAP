import { fromNumeric } from "../../../../../infrastructure/database/prisma/numeric.js";
import type { MenuRecord } from "../../../service/interfaces/catalog.repository.js";

export interface MenuRow {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly isAlternative: boolean;
    readonly tags: readonly string[];
    readonly photoKey: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
    readonly menuIngredients: readonly { readonly ingredientId: string; readonly quantityPerPortion: string }[];
}

export function toMenuRecord(row: MenuRow): MenuRecord {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        isAlternative: row.isAlternative,
        tags: row.tags,
        photoKey: row.photoKey,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        ingredients: row.menuIngredients.map(line => ({
            ingredientId: line.ingredientId,
            quantityPerPortion: fromNumeric(line.quantityPerPortion),
        })),
    };
}

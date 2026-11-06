import { getForeignKeyViolationConstraint } from "../../../../../infrastructure/database/prisma/sql-errors.js";
import type { MenuIngredientRecord } from "../../../service/interfaces/catalog.repository.js";
import { UnknownIngredientError } from "../../../service/interfaces/catalog.repository.js";

export function toUnknownIngredientError(
    cause: unknown,
    lines: readonly MenuIngredientRecord[] | undefined,
): UnknownIngredientError | null {
    if (lines === undefined) return null;
    if (getForeignKeyViolationConstraint(cause) !== "menu_ingredient_ingredient_id_fkey") return null;
    return new UnknownIngredientError(lines.map(line => line.ingredientId));
}

import { getForeignKeyViolationConstraint } from "../../../../../infrastructure/database/prisma/sql-errors.js";
import { InvalidStateError } from "../../../../../shared/errors/invalid-state-error.js";
import { COOK_NOT_ACTIVE_KITCHEN_MESSAGE } from "../../../domain/menu-components.js";
import type { NewMenuComponentRecord } from "../../../service/interfaces/catalog.repository.js";

export function toUnknownCookError(
    cause: unknown,
    components: readonly NewMenuComponentRecord[] | undefined,
): InvalidStateError | null {
    if (components === undefined) return null;
    if (getForeignKeyViolationConstraint(cause) !== "menu_component_cook_id_fkey") return null;
    return new InvalidStateError(COOK_NOT_ACTIVE_KITCHEN_MESSAGE, { cause });
}

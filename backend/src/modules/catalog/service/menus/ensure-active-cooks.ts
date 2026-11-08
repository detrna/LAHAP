import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { COOK_NOT_ACTIVE_KITCHEN_MESSAGE, distinctCookIds } from "../../domain/menu-components.js";
import type { MenuComponentInput } from "../../domain/menu.domain.js";
import type { CookDirectory } from "../interfaces/cook-directory.js";

export async function ensureActiveCooks(
    cooks: CookDirectory,
    components: readonly MenuComponentInput[],
): Promise<void> {
    const cookIds = distinctCookIds(components);
    if (cookIds.length === 0) return;

    const active = new Set(await cooks.filterActiveUserIds(cookIds, "KITCHEN"));
    if (cookIds.some(cookId => !active.has(cookId))) throw new InvalidStateError(COOK_NOT_ACTIVE_KITCHEN_MESSAGE);
}

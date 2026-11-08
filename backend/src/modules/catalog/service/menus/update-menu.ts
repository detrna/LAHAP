import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { toComponentRecords } from "../../domain/menu-components.js";
import type { Menu, MenuComponentInput } from "../../domain/menu.domain.js";
import { isSameRecipe, type RecipeLineInput } from "../../domain/recipe.js";
import type { CatalogService } from "../catalog.service.js";
import { assertChangeReason } from "../change-reason.js";
import { MenuNotFoundError } from "../interfaces/catalog.repository.js";
import { announceScheduleChanges } from "../schedules/announce-schedule-changes.js";
import { ensureActiveCooks } from "./ensure-active-cooks.js";
import { ensureKnownIngredients } from "./ensure-known-ingredients.js";

export const MENU_IS_ALTERNATIVE_MESSAGE = "menu is the alternative of a schedule";

export interface UpdateMenuInput {
    readonly name?: string | undefined;
    readonly description?: string | undefined;
    readonly isAlternative?: boolean | undefined;
    readonly tags?: readonly string[] | undefined;
    readonly photoKey?: string | undefined;
    readonly ingredients?: readonly RecipeLineInput[] | undefined;
    readonly components?: readonly MenuComponentInput[] | undefined;
    readonly changeReason?: string | undefined;
}

export async function updateMenu(this: CatalogService, id: string, input: UpdateMenuInput): Promise<Menu> {
    const existing = await this.catalogRepository.findMenuById(id);
    if (existing === null) throw new MenuNotFoundError(id);

    if (input.ingredients !== undefined) await ensureKnownIngredients(this.ingredients, input.ingredients);
    if (input.components !== undefined) await ensureActiveCooks(this.cooks, input.components);
    if (input.photoKey !== undefined && input.photoKey !== existing.photoKey) {
        await this.photoKeys.assertPhotoKeyExists(input.photoKey);
    }

    if (input.isAlternative === false && existing.isAlternative) {
        const asAlternative = await this.catalogRepository.findScheduleIdsUsingMenu(id, "alternative");
        if (asAlternative.length > 0) throw new InvalidStateError(MENU_IS_ALTERNATIVE_MESSAGE);
    }

    let paid: readonly string[] = [];
    if (input.ingredients !== undefined && !isSameRecipe(existing.ingredients, input.ingredients)) {
        const scheduleIds = await this.catalogRepository.findScheduleIdsUsingMenu(id);
        paid = scheduleIds.length > 0 ? await this.orderActivity.findSchedulesWithOrders(scheduleIds, ["Success"]) : [];
        if (paid.length > 0) assertChangeReason(input.changeReason, "changeReason");
    }

    const { changeReason: _changeReason, components, ...changes } = input;
    const record = await this.catalogRepository.updateMenu(id, {
        ...changes,
        ...(components !== undefined ? { components: toComponentRecords(components) } : {}),
    });
    if (record === null) throw new MenuNotFoundError(id);
    if (input.changeReason !== undefined) {
        await announceScheduleChanges(
            this,
            paid.map(scheduleId => ({ scheduleId, changeReason: input.changeReason as string })),
        );
    }
    return this.presentMenu(record);
}

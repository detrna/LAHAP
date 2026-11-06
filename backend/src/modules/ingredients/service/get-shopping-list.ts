import { nextMonday } from "../../../shared/time/calendar.js";
import { resolveDateRange } from "../../../shared/time/date-range.js";
import { sumIngredientRequirements } from "../../../shared/utils/ingredient-requirements/ingredient-requirements.js";
import type { ShoppingListItem } from "../domain/ingredient.domain.js";
import { buildShoppingList } from "../domain/shopping-list.js";
import type { IngredientsService } from "./ingredients.service.js";

export const SHOPPING_LIST_DEFAULT_DAYS = 7;
export const SHOPPING_LIST_MAX_DAYS = 31;

export interface ShoppingListInput {
    readonly from?: Temporal.PlainDate | undefined;
    readonly to?: Temporal.PlainDate | undefined;
}

export async function getShoppingList(
    this: IngredientsService,
    input: ShoppingListInput = {},
): Promise<readonly ShoppingListItem[]> {
    const { from, to } = resolveDateRange(input, {
        defaultFrom: nextMonday(this.clock.now().toPlainDate()),
        defaultSpanDays: SHOPPING_LIST_DEFAULT_DAYS,
        maxDays: SHOPPING_LIST_MAX_DAYS,
    });

    const schedules = await this.menus.findSchedules({ from, to, isPublished: true });
    if (schedules.length === 0) return [];

    const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));
    const counts = await this.portions.countPortionsBySchedule([...scheduleById.keys()]);

    const portionsByMenu = new Map<string, number>();
    for (const { scheduleId, usesAlternativeMenu, portions } of counts) {
        const schedule = scheduleById.get(scheduleId);
        const menuId = usesAlternativeMenu ? schedule?.alternativeMenuId : schedule?.primaryMenuId;
        if (menuId === undefined || menuId === null) continue;
        portionsByMenu.set(menuId, (portionsByMenu.get(menuId) ?? 0) + portions);
    }
    if (portionsByMenu.size === 0) return [];

    const recipeLines = await this.menus.getRecipeLines([...portionsByMenu.keys()]);
    const requirements = sumIngredientRequirements(portionsByMenu, recipeLines);
    if (requirements.size === 0) return [];

    const ingredients = await this.ingredientsRepository.findByIds([...requirements.keys()]);
    return buildShoppingList(requirements, ingredients);
}

import type { MenuIngredientUsage, RecipeLine } from "../../../catalog/domain/menu.domain.js";
import type { ScheduleSummary } from "../../../catalog/domain/schedule.domain.js";

export interface MenuLookup {
    findMenusUsingIngredients(ingredientIds: readonly string[]): Promise<readonly MenuIngredientUsage[]>;
    findSchedules(filter: {
        readonly from: Temporal.PlainDate;
        readonly to: Temporal.PlainDate;
        readonly isPublished: boolean;
    }): Promise<readonly ScheduleSummary[]>;
    getRecipeLines(menuIds: readonly string[]): Promise<readonly RecipeLine[]>;
}

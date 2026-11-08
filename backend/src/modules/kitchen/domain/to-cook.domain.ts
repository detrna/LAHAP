import type { MealTimeView } from "../../../shared/utils/meal-time/meal-time.js";
import type { Allergy } from "../../catalog/domain/allergy.domain.js";
import type { MenuComponent } from "../../catalog/domain/menu.domain.js";
import type { IngredientUnit } from "../../ingredients/domain/ingredient.domain.js";

export interface ToCookMenu {
    readonly packageId: string;
    readonly packageName: string;
    readonly menuId: string;
    readonly name: string;
    readonly isAlternative: boolean;
    readonly deliveryTime: MealTimeView;
    readonly portions: number;
    readonly components: readonly MenuComponent[];
}

export interface ToCookIngredient {
    readonly ingredientId: string;
    readonly name: string;
    readonly unit: IngredientUnit;
    readonly totalQuantity: number;
}

export interface SpecialCategoryEntry {
    readonly orderId: string;
    readonly recipientName: string;
    readonly isDelivery: boolean;
    readonly deliveryTime: MealTimeView;
    readonly reasons: readonly ("ALLERGY_CLASH" | "ALLERGY_NOTE" | "NOTE")[];
    readonly conflictingAllergies?: readonly Allergy[] | undefined;
    readonly allergyNote?: string | null | undefined;
    readonly note?: string | null | undefined;
    readonly primaryMenuId: string;
    readonly alternativeMenuId: string | null;
    readonly usesAlternativeMenu: boolean;
    readonly packageName?: string | undefined;
}

export interface ToCookReport {
    readonly date: string;
    readonly deliveryTime: MealTimeView | null;
    readonly menus: readonly ToCookMenu[];
    readonly ingredients: readonly ToCookIngredient[];
    readonly specialCategory: readonly SpecialCategoryEntry[];
}

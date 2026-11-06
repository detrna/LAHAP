import type { Ingredient } from "../../ingredients/domain/ingredient.domain.js";
import type { Allergy } from "./allergy.domain.js";

export interface MenuIngredient {
    readonly ingredientId: string;
    readonly quantityPerPortion: number;
    readonly ingredient?: Ingredient | undefined;
}

export interface Menu {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly isAlternative: boolean;
    readonly tags: readonly string[];
    readonly photoKey: string;
    readonly photoUrl: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly ingredients?: readonly MenuIngredient[] | undefined;
    readonly allergies?: readonly Allergy[] | undefined;
}

export interface RecipeLine {
    readonly menuId: string;
    readonly ingredientId: string;
    readonly quantityPerPortion: number;
}

export interface MenuIngredientUsage {
    readonly ingredientId: string;
    readonly menuId: string;
    readonly menuName: string;
}

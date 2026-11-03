import type { Allergy } from "../../catalog/domain/allergy.domain.js";

export const INGREDIENT_UNITS = ["kg", "gram", "liter", "ml", "butir", "ikat"] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export interface Ingredient {
    readonly id: string;
    readonly name: string;
    readonly unit: IngredientUnit;
    readonly stock: number;
    readonly minimumThreshold: number;
    readonly isLowStock: boolean;
    readonly photoKey: string;
    readonly photoUrl: string;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly allergies?: readonly Allergy[] | undefined;
}

export interface ShoppingListItem {
    readonly ingredientId: string;
    readonly name: string;
    readonly unit: IngredientUnit;
    readonly requiredQuantity: number;
    readonly currentStock: number;
    readonly shortageQuantity: number;
}

export interface PhotoEstimate {
    readonly ingredientId: string;
    readonly estimatedQuantity: number;
    readonly unit: IngredientUnit;
    readonly confidence?: number | undefined;
}

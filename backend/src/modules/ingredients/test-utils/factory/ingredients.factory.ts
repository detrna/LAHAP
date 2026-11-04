import type { Ingredient, ShoppingListItem, PhotoEstimate } from "../../domain/ingredient.domain.js";

export function buildIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Dada Ayam",
        unit: "kg",
        stock: 0,
        minimumThreshold: 10,
        isLowStock: false,
        photoKey: "menus/2026/11/3f2b6c1e.webp",
        photoUrl: "https://example.com/photoUrl",
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildShoppingListItem(overrides: Partial<ShoppingListItem> = {}): ShoppingListItem {
    return {
        ingredientId: "00000000-0000-4000-8000-000000000001",
        name: "test name",
        unit: "kg",
        requiredQuantity: 0,
        currentStock: 0,
        shortageQuantity: 0,
        ...overrides,
    };
}

export function buildPhotoEstimate(overrides: Partial<PhotoEstimate> = {}): PhotoEstimate {
    return { ingredientId: "00000000-0000-4000-8000-000000000001", estimatedQuantity: 0, unit: "kg", ...overrides };
}

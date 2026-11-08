import type {
    Ingredient,
    IngredientStockChange,
    PhotoEstimate,
    ReceiptExtractResult,
    ShoppingListItem,
} from "../../domain/ingredient.domain.js";
import type { IngredientRecord, IngredientStockChangeRecord } from "../../service/interfaces/ingredients.repository.js";

export function buildIngredient(overrides: Partial<Ingredient> = {}): Ingredient {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Dada Ayam",
        unit: "kg",
        stock: 0,
        minimumThreshold: 10,
        isLowStock: false,
        photoKey: "ingredients/2026/11/3f2b6c1e.webp",
        photoUrl: "https://example.com/photoUrl",
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildIngredientRecord(overrides: Partial<IngredientRecord> = {}): IngredientRecord {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Dada Ayam",
        unit: "kg",
        stock: 0,
        minimumThreshold: 10,
        photoKey: "ingredients/2026/11/3f2b6c1e.webp",
        allergyIds: [],
        createdAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
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

export function buildReceiptExtractResult(overrides: Partial<ReceiptExtractResult> = {}): ReceiptExtractResult {
    return {
        items: [{ id: "00000000-0000-4000-8000-000000000001", name: "Dada Ayam", unit: "kg", stock: 10 }],
        ...overrides,
    };
}

export function buildIngredientStockChange(overrides: Partial<IngredientStockChange> = {}): IngredientStockChange {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        ingredientId: "00000000-0000-4000-8000-000000000002",
        previousStock: 0,
        newStock: 10,
        delta: 10,
        changedById: "00000000-0000-4000-8000-000000000003",
        changedBy: null,
        changedAt: "2026-11-03T08:00:00.000+07:00",
        ...overrides,
    };
}

export function buildIngredientStockChangeRecord(
    overrides: Partial<IngredientStockChangeRecord> = {},
): IngredientStockChangeRecord {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        ingredientId: "00000000-0000-4000-8000-000000000002",
        previousStock: 0,
        newStock: 10,
        changedById: "00000000-0000-4000-8000-000000000003",
        changedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        ...overrides,
    };
}

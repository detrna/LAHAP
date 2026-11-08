import { vi } from "vitest";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import type { ReceiptExtractor } from "../../../../shared/ports/receipt-extractor/receipt-extractor.js";
import type { StockLevelEstimator } from "../../../../shared/ports/stock-level-estimator/stock-level-estimator.js";
import type { IngredientsService } from "../../service/ingredients.service.js";
import type { AllergyLookup } from "../../service/interfaces/allergy-lookup.js";
import type { IngredientsRepository } from "../../service/interfaces/ingredients.repository.js";
import type { MenuLookup } from "../../service/interfaces/menu-lookup.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import type { PortionCounts } from "../../service/interfaces/portion-counts.js";
import type { UserDirectory } from "../../service/interfaces/user-directory.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedObjectStorage = Mocked<Pick<ObjectStorage, "getSignedUrl">>;

export type MockedIngredientsService = Mocked<
    Pick<
        IngredientsService,
        | "listIngredients"
        | "listStockHistory"
        | "getIngredient"
        | "createIngredients"
        | "updateIngredients"
        | "updateIngredient"
        | "updateStock"
        | "deleteIngredients"
        | "getShoppingList"
        | "estimateStock"
        | "extractReceipt"
    >
>;

export function createMockIngredientsRepository(): Mocked<IngredientsRepository> {
    return {
        list: vi.fn(async () => ({ items: [], total: 0 })),
        listStockHistory: vi.fn(async () => ({ items: [], total: 0 })),
        findAll: vi.fn(async () => []),
        findById: vi.fn(async () => null),
        findByIds: vi.fn(async () => []),
        findMissingIds: vi.fn(async () => []),
        createMany: vi.fn(async () => []),
        updateMany: vi.fn(async () => []),
        deleteMany: vi.fn(async () => 0),
    } as Mocked<IngredientsRepository>;
}

export function createMockObjectStorage(): MockedObjectStorage {
    return {
        getSignedUrl: vi.fn(async (key: string) => `https://storage.test/${key}?signed`),
    } as MockedObjectStorage;
}

export function createMockPhotoKeys(): Mocked<PhotoKeys> {
    return { assertPhotoKeyExists: vi.fn(async () => undefined) } as Mocked<PhotoKeys>;
}

export function createMockAllergyLookup(): Mocked<AllergyLookup> {
    return {
        findMissingAllergyIds: vi.fn(async () => []),
        getAllergiesByIds: vi.fn(async () => []),
    } as Mocked<AllergyLookup>;
}

export function createMockMenuLookup(): Mocked<MenuLookup> {
    return {
        findMenusUsingIngredients: vi.fn(async () => []),
        findSchedules: vi.fn(async () => []),
        getRecipeLines: vi.fn(async () => []),
    } as Mocked<MenuLookup>;
}

export function createMockPortionCounts(): Mocked<PortionCounts> {
    return { countPortionsBySchedule: vi.fn(async () => []) } as Mocked<PortionCounts>;
}

export function createMockStockLevelEstimator(): Mocked<StockLevelEstimator> {
    return {
        estimate: vi.fn(async () => ({ item: { name: "", quantity: 0, unit: "" } })),
    } as Mocked<StockLevelEstimator>;
}

export function createMockReceiptExtractor(): Mocked<ReceiptExtractor> {
    return {
        extract: vi.fn(async () => ({ items: [] })),
    } as Mocked<ReceiptExtractor>;
}

export function createMockUserDirectory(): Mocked<UserDirectory> {
    return {
        getSummaries: vi.fn(async () => []),
    } as Mocked<UserDirectory>;
}

export function createMockIngredientsService(): MockedIngredientsService {
    return {
        listIngredients: vi.fn(),
        listStockHistory: vi.fn(),
        getIngredient: vi.fn(),
        createIngredients: vi.fn(),
        updateIngredients: vi.fn(),
        updateIngredient: vi.fn(),
        updateStock: vi.fn(),
        deleteIngredients: vi.fn(),
        getShoppingList: vi.fn(),
        estimateStock: vi.fn(),
        extractReceipt: vi.fn(),
    } as MockedIngredientsService;
}

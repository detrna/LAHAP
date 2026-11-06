import { vi } from "vitest";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import type { IngredientsService } from "../../service/ingredients.service.js";
import type { AllergyLookup } from "../../service/interfaces/allergy-lookup.js";
import type { IngredientsRepository } from "../../service/interfaces/ingredients.repository.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedObjectStorage = Mocked<Pick<ObjectStorage, "getSignedUrl">>;

export type MockedIngredientsService = Mocked<
    Pick<
        IngredientsService,
        | "listIngredients"
        | "getIngredient"
        | "createIngredients"
        | "updateIngredients"
        | "updateIngredient"
        | "updateStock"
        | "deleteIngredients"
    >
>;

export function createMockIngredientsRepository(): Mocked<IngredientsRepository> {
    return {
        list: vi.fn(async () => ({ items: [], total: 0 })),
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

export function createMockIngredientsService(): MockedIngredientsService {
    return {
        listIngredients: vi.fn(),
        getIngredient: vi.fn(),
        createIngredients: vi.fn(),
        updateIngredients: vi.fn(),
        updateIngredient: vi.fn(),
        updateStock: vi.fn(),
        deleteIngredients: vi.fn(),
    } as MockedIngredientsService;
}

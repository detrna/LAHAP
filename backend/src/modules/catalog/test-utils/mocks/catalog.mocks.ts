import { vi } from "vitest";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import type { CatalogService } from "../../service/catalog.service.js";
import type { CatalogRepository } from "../../service/interfaces/catalog.repository.js";
import type { OrderActivity } from "../../service/interfaces/order-activity.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedObjectStorage = Mocked<Pick<ObjectStorage, "getSignedUrl">>;

export type MockedCatalogService = Mocked<
    Pick<
        CatalogService,
        | "listAllergies"
        | "listAllergyPage"
        | "getAllergy"
        | "createAllergy"
        | "updateAllergy"
        | "deleteAllergy"
        | "listAvailablePackages"
        | "getAvailablePackage"
        | "listPackages"
        | "getPackage"
        | "createPackage"
        | "updatePackage"
        | "deletePackage"
    >
>;

export function createMockCatalogRepository(): Mocked<CatalogRepository> {
    return {
        findMissingAllergyIds: vi.fn(async () => []),
        findAllergiesByIds: vi.fn(async () => []),
        findAllAllergies: vi.fn(async () => []),
        listAllergies: vi.fn(async () => ({ items: [], total: 0 })),
        findAllergyById: vi.fn(async () => null),
        createAllergy: vi.fn(),
        updateAllergy: vi.fn(async () => null),
        deleteAllergy: vi.fn(async () => true),
        listPackages: vi.fn(async () => ({ items: [], total: 0 })),
        findPackageById: vi.fn(async () => null),
        findPackagesByIds: vi.fn(async () => []),
        findMissingPackageIds: vi.fn(async () => []),
        createPackage: vi.fn(),
        updatePackage: vi.fn(async () => null),
        deletePackage: vi.fn(async () => true),
        findScheduleIdsAtTimes: vi.fn(async () => []),
    } as Mocked<CatalogRepository>;
}

export function createMockObjectStorage(): MockedObjectStorage {
    return {
        getSignedUrl: vi.fn(async (key: string) => `https://storage.test/${key}?signed`),
    } as MockedObjectStorage;
}

export function createMockPhotoKeys(): Mocked<PhotoKeys> {
    return { assertPhotoKeyExists: vi.fn(async () => undefined) } as Mocked<PhotoKeys>;
}

export function createMockOrderActivity(): Mocked<OrderActivity> {
    return {
        countActiveSubscribers: vi.fn(async () => new Map()),
        findSchedulesWithOrders: vi.fn(async () => []),
    } as Mocked<OrderActivity>;
}

export function createMockCatalogService(): MockedCatalogService {
    return {
        listAllergies: vi.fn(),
        listAllergyPage: vi.fn(),
        getAllergy: vi.fn(),
        createAllergy: vi.fn(),
        updateAllergy: vi.fn(),
        deleteAllergy: vi.fn(),
        listAvailablePackages: vi.fn(),
        getAvailablePackage: vi.fn(),
        listPackages: vi.fn(),
        getPackage: vi.fn(),
        createPackage: vi.fn(),
        updatePackage: vi.fn(),
        deletePackage: vi.fn(),
    } as MockedCatalogService;
}

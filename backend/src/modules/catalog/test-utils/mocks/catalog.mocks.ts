import { vi } from "vitest";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import type { CatalogService } from "../../service/catalog.service.js";
import type { AdminNotifier } from "../../service/interfaces/admin-notifier.js";
import type { CatalogRepository } from "../../service/interfaces/catalog.repository.js";
import type { IngredientLookup } from "../../service/interfaces/ingredient-lookup.js";
import type { OrderActivity } from "../../service/interfaces/order-activity.js";
import type { ScheduleAnnouncer } from "../../service/interfaces/schedule-announcer.js";
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
        | "listMenus"
        | "getMenu"
        | "createMenu"
        | "updateMenu"
        | "deleteMenu"
        | "listSchedules"
        | "getSchedule"
        | "listPublishedSchedules"
        | "createSchedules"
        | "updateSchedules"
        | "updateSchedule"
        | "deleteSchedules"
        | "publishSchedules"
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
        findAvailablePackages: vi.fn(async () => []),
        findMissingPackageIds: vi.fn(async () => []),
        createPackage: vi.fn(),
        updatePackage: vi.fn(async () => null),
        deletePackage: vi.fn(async () => true),
        findScheduleIdsAtTimes: vi.fn(async () => []),
        listMenus: vi.fn(async () => ({ items: [], total: 0 })),
        findMenuById: vi.fn(async () => null),
        findMenusByIds: vi.fn(async () => []),
        findMenuKinds: vi.fn(async () => []),
        createMenu: vi.fn(),
        updateMenu: vi.fn(async () => null),
        deleteMenu: vi.fn(async () => true),
        findScheduleIdsUsingMenu: vi.fn(async () => []),
        findRecipeLines: vi.fn(async () => []),
        findMenusUsingIngredients: vi.fn(async () => []),
        listSchedules: vi.fn(async () => ({ items: [], total: 0 })),
        findSchedules: vi.fn(async () => []),
        findScheduleById: vi.fn(async () => null),
        findMissingScheduleIds: vi.fn(async () => []),
        createSchedules: vi.fn(async () => []),
        updateSchedules: vi.fn(async () => []),
        deleteSchedules: vi.fn(async () => 0),
        setSchedulesPublished: vi.fn(async () => 0),
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
        findSchedulesUsingAlternative: vi.fn(async () => []),
        findSubscriptionPeriods: vi.fn(async () => []),
        deleteInactiveSlots: vi.fn(async () => undefined),
    } as Mocked<OrderActivity>;
}

export function createMockScheduleAnnouncer(): Mocked<ScheduleAnnouncer> {
    return { announce: vi.fn(async () => undefined) } as Mocked<ScheduleAnnouncer>;
}

export function createMockAdminNotifier(): Mocked<AdminNotifier> {
    return { notifyAdmins: vi.fn(async () => []) } as Mocked<AdminNotifier>;
}

export function createMockIngredientLookup(): Mocked<IngredientLookup> {
    return {
        findMissingIngredientIds: vi.fn(async () => []),
        getIngredientsByIds: vi.fn(async () => []),
    } as Mocked<IngredientLookup>;
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
        listMenus: vi.fn(),
        getMenu: vi.fn(),
        createMenu: vi.fn(),
        updateMenu: vi.fn(),
        deleteMenu: vi.fn(),
        listSchedules: vi.fn(),
        getSchedule: vi.fn(),
        listPublishedSchedules: vi.fn(),
        createSchedules: vi.fn(),
        updateSchedules: vi.fn(),
        updateSchedule: vi.fn(),
        deleteSchedules: vi.fn(),
        publishSchedules: vi.fn(),
    } as MockedCatalogService;
}

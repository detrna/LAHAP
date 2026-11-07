import { vi } from "vitest";
import type { KitchenService } from "../../service/kitchen.service.js";
import type { KitchenCatalog } from "../../service/interfaces/kitchen-catalog.js";
import type { KitchenCustomers } from "../../service/interfaces/kitchen-customers.js";
import type { KitchenSlots } from "../../service/interfaces/kitchen-slots.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedKitchenService = Mocked<Pick<KitchenService, "getToCook">>;

export function createMockKitchenCatalog(): Mocked<KitchenCatalog> {
    return {
        findSchedules: vi.fn(async () => []),
        getMenusByIds: vi.fn(async () => []),
        getPackagesByIds: vi.fn(async () => []),
    } as Mocked<KitchenCatalog>;
}

export function createMockKitchenSlots(): Mocked<KitchenSlots> {
    return { listKitchenSlots: vi.fn(async () => []) } as Mocked<KitchenSlots>;
}

export function createMockKitchenCustomers(): Mocked<KitchenCustomers> {
    return { getAllergyProfiles: vi.fn(async () => []) } as Mocked<KitchenCustomers>;
}

export function createMockKitchenService(): MockedKitchenService {
    return { getToCook: vi.fn(async () => []) } as MockedKitchenService;
}

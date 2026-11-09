import { vi } from "vitest";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import type { OrderStats } from "../../service/interfaces/order-stats.js";
import type { PhotoKeys } from "../../service/interfaces/photo-keys.js";
import type { TiersRepository } from "../../service/interfaces/tiers.repository.js";
import type { TiersService } from "../../service/tiers.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedObjectStorage = Mocked<Pick<ObjectStorage, "getSignedUrl">>;

export type MockedTiersService = Mocked<
    Pick<
        TiersService,
        | "listTiers"
        | "listPublicTiers"
        | "getTier"
        | "createTier"
        | "updateTier"
        | "deleteTier"
        | "getMembershipOverview"
    >
>;

export function createMockTiersRepository(): Mocked<TiersRepository> {
    const repository = {
        listTiers: vi.fn(async () => ({ items: [], total: 0 })),
        findTierById: vi.fn(async () => null),
        createTier: vi.fn(),
        updateTier: vi.fn(async () => null),
        deleteTier: vi.fn(async () => false),
        listAllTiers: vi.fn(async () => []),
        findMembershipByUserId: vi.fn(async () => null),
        listMembershipWindows: vi.fn(async () => []),
        upsertMembership: vi.fn(async () => undefined),
        changeMembershipTier: vi.fn(async () => undefined),
        deleteMembership: vi.fn(async () => undefined),
        withUserLock: vi.fn(),
    } as unknown as Mocked<TiersRepository>;
    repository.withUserLock.mockImplementation(async (_userId: string, work: (store: unknown) => Promise<unknown>) =>
        work(repository),
    );
    return repository;
}

export function createMockObjectStorage(): MockedObjectStorage {
    return {
        getSignedUrl: vi.fn(async (key: string) => `https://storage.test/${key}?signed`),
    } as MockedObjectStorage;
}

export function createMockPhotoKeys(): Mocked<PhotoKeys> {
    return { assertPhotoKeyExists: vi.fn(async () => undefined) } as Mocked<PhotoKeys>;
}

export function createMockOrderStats(): Mocked<OrderStats> {
    return {
        countPaidServiceDays: vi.fn(async () => 0),
        sumTierDiscounts: vi.fn(async () => new Map()),
    } as Mocked<OrderStats>;
}

export function createMockTiersService(): MockedTiersService {
    return {
        listTiers: vi.fn(),
        listPublicTiers: vi.fn(),
        getTier: vi.fn(),
        createTier: vi.fn(),
        updateTier: vi.fn(),
        deleteTier: vi.fn(),
        getMembershipOverview: vi.fn(),
    } as MockedTiersService;
}

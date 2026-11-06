import { vi } from "vitest";
import type { ObjectStorage } from "../../../../shared/ports/object-storage/object-storage.js";
import type { TiersRepository } from "../../service/interfaces/tiers.repository.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export function createMockTiersRepository(): Mocked<TiersRepository> {
    return {
        findMembershipByUserId: vi.fn(async () => null),
    } as Mocked<TiersRepository>;
}

export function createMockObjectStorage(): Mocked<Pick<ObjectStorage, "getSignedUrl">> {
    return {
        getSignedUrl: vi.fn(async (key: string) => `https://storage.test/${key}?signed`),
    } as Mocked<Pick<ObjectStorage, "getSignedUrl">>;
}

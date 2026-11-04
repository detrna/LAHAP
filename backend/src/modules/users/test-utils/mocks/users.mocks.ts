import { vi } from "vitest";
import type { Hasher } from "../../../../shared/ports/hasher/hasher.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export function createMockUsersRepository(): Mocked<UsersRepository> {
    return {
        findById: vi.fn(async () => null),
        findCredentialsByPhone: vi.fn(async () => null),
        findCredentialsByEmail: vi.fn(async () => null),
        existsByPhone: vi.fn(async () => false),
        existsByEmail: vi.fn(async () => false),
        findMissingAllergyIds: vi.fn(async () => []),
        create: vi.fn(),
    } as Mocked<UsersRepository>;
}

export function createMockHasher(): Mocked<Hasher> {
    return {
        hash: vi.fn(async (plain: string) => `hashed:${plain}`),
        compare: vi.fn(async (plain: string, hashed: string) => hashed === `hashed:${plain}`),
    } as Mocked<Hasher>;
}

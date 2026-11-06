import { vi } from "vitest";
import type { Hasher } from "../../../../shared/ports/hasher/hasher.js";
import type { AllergyLookup } from "../../service/interfaces/allergy-lookup.js";
import type { MembershipLookup } from "../../service/interfaces/membership-lookup.js";
import type { SessionRevoker } from "../../service/interfaces/session-revoker.js";
import type { SubscriptionHistory } from "../../service/interfaces/subscription-history.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";
import type { UsersService } from "../../service/users.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedUsersService = Mocked<
    Pick<
        UsersService,
        "getProfile" | "updateProfile" | "changePassword" | "listUsers" | "createUser" | "getUser" | "updateUser"
    >
>;

export function createMockUsersRepository(): Mocked<UsersRepository> {
    return {
        findById: vi.fn(async () => null),
        findCredentialsByPhone: vi.fn(async () => null),
        findCredentialsByEmail: vi.fn(async () => null),
        findCredentialsById: vi.fn(async () => null),
        existsByPhone: vi.fn(async () => false),
        existsByEmail: vi.fn(async () => false),
        findConflict: vi.fn(async () => null),
        create: vi.fn(),
        update: vi.fn(async () => null),
        updatePasswordHash: vi.fn(async () => true),
        list: vi.fn(async () => ({ items: [], total: 0 })),
    } as Mocked<UsersRepository>;
}

export function createMockHasher(): Mocked<Hasher> {
    return {
        hash: vi.fn(async (plain: string) => `hashed:${plain}`),
        compare: vi.fn(async (plain: string, hashed: string) => hashed === `hashed:${plain}`),
    } as Mocked<Hasher>;
}

export function createMockAllergyLookup(): Mocked<AllergyLookup> {
    return {
        findMissingAllergyIds: vi.fn(async () => []),
        getAllergiesByIds: vi.fn(async () => []),
    } as Mocked<AllergyLookup>;
}

export function createMockMembershipLookup(): Mocked<MembershipLookup> {
    return {
        getMembership: vi.fn(async () => null),
    } as Mocked<MembershipLookup>;
}

export function createMockSubscriptionHistory(): Mocked<SubscriptionHistory> {
    return {
        findLastSuccessEndDates: vi.fn(async () => new Map()),
        findUserIdsWithLastSuccessEndBefore: vi.fn(async () => []),
    } as Mocked<SubscriptionHistory>;
}

export function createMockSessionRevoker(): Mocked<SessionRevoker> {
    return {
        revokeSessionsOfUser: vi.fn(async () => undefined),
    } as Mocked<SessionRevoker>;
}

export function createMockUsersService(): MockedUsersService {
    return {
        getProfile: vi.fn(),
        updateProfile: vi.fn(),
        changePassword: vi.fn(async () => undefined),
        listUsers: vi.fn(async () => ({ items: [], total: 0 })),
        createUser: vi.fn(),
        getUser: vi.fn(),
        updateUser: vi.fn(),
    } as MockedUsersService;
}

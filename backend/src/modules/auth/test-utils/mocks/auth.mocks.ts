import { vi } from "vitest";
import type { AuthService } from "../../service/auth.service.js";
import type { AuthRepository } from "../../service/interfaces/auth.repository.js";
import type { UserAccounts } from "../../service/interfaces/user-accounts.js";
import { buildAuthSession, buildRefreshTokenRecord } from "../factory/auth.factory.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedAuthService = Mocked<Pick<AuthService, "register" | "login" | "refresh" | "logout">>;

export function createMockUserAccounts(): Mocked<UserAccounts> {
    return {
        registerCustomer: vi.fn(),
        verifyCredentials: vi.fn(async () => null),
        getActiveById: vi.fn(async () => null),
    } as Mocked<UserAccounts>;
}

export function createMockAuthRepository(): Mocked<AuthRepository> {
    return {
        createRefreshToken: vi.fn(async token => buildRefreshTokenRecord(token)),
        findRefreshToken: vi.fn(async () => null),
        revokeRefreshToken: vi.fn(async () => true),
        revokeRefreshTokensOfUser: vi.fn(async () => 0),
    } as Mocked<AuthRepository>;
}

export function createMockAuthService(session = buildAuthSession()): MockedAuthService {
    return {
        register: vi.fn(async () => session),
        login: vi.fn(async () => session),
        refresh: vi.fn(async () => session),
        logout: vi.fn(async () => undefined),
    } as MockedAuthService;
}

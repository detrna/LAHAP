import type { UserSummary, User } from "../../domain/user.domain.js";

export function buildUserSummary(overrides: Partial<UserSummary> = {}): UserSummary {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "test name",
        phone: "6281200000000",
        role: "CUSTOMER",
        ...overrides,
    };
}

export function buildUser(overrides: Partial<User> = {}): User {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "test name",
        phone: "6281200000000",
        role: "CUSTOMER",
        isActive: true,
        createdAt: "2026-11-03T00:00:00.000Z",
        updatedAt: "2026-11-03T00:00:00.000Z",
        ...overrides,
    };
}

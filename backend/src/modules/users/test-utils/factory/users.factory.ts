import type { User, UserSummary } from "../../domain/user.domain.js";
import type {
    MembershipRecord,
    MembershipTierRecord,
    UserAllergyRecord,
    UserCredentialsRecord,
    UserRecord,
} from "../../service/interfaces/users.repository.js";

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
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildUserAllergyRecord(overrides: Partial<UserAllergyRecord> = {}): UserAllergyRecord {
    return {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Kacang",
        createdAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        ...overrides,
    };
}

export function buildUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "test name",
        email: null,
        phone: "6281200000000",
        role: "CUSTOMER",
        address: null,
        latitude: null,
        longitude: null,
        allergyNote: null,
        isActive: true,
        createdAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        allergies: [],
        ...overrides,
    };
}

export function buildUserCredentialsRecord(overrides: Partial<UserCredentialsRecord> = {}): UserCredentialsRecord {
    return {
        user: buildUserRecord(),
        passwordHash: "$2b$10$testhashtesthashtesthashtesthashtesthashtesthashtes",
        ...overrides,
    };
}

export function buildMembershipTierRecord(overrides: Partial<MembershipTierRecord> = {}): MembershipTierRecord {
    return {
        id: "00000000-0000-4000-8000-000000000003",
        name: "Gold",
        description: null,
        requiredSubscriptionDays: 30,
        durationDays: 30,
        discountPercent: 10,
        photoKey: null,
        createdAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        ...overrides,
    };
}

export function buildMembershipRecord(overrides: Partial<MembershipRecord> = {}): MembershipRecord {
    return {
        tierId: "00000000-0000-4000-8000-000000000003",
        tier: buildMembershipTierRecord(),
        startedAt: Temporal.PlainDateTime.from("2026-11-01T01:00:00"),
        expiresAt: Temporal.PlainDateTime.from("2026-12-01T01:00:00"),
        ...overrides,
    };
}

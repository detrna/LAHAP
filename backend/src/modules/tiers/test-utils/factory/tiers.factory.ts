import type { Membership, MembershipOverview } from "../../domain/membership.domain.js";
import type { Tier } from "../../domain/tier.domain.js";
import type { MembershipRecord, TierRecord } from "../../service/interfaces/tiers.repository.js";

export function buildTier(overrides: Partial<Tier> = {}): Tier {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Gold",
        requiredSubscriptionDays: 0,
        durationDays: 30,
        discountPercent: 0,
        photoKey: null,
        photoUrl: null,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildMembership(overrides: Partial<Membership> = {}): Membership {
    return {
        tierId: "00000000-0000-4000-8000-000000000001",
        startedAt: "2026-11-03T00:00:00.000+07:00",
        expiresAt: "2026-11-03T00:00:00.000+07:00",
        isActive: false,
        ...overrides,
    };
}

export function buildMembershipOverview(overrides: Partial<MembershipOverview> = {}): MembershipOverview {
    return {
        membership: null,
        subscriptionDays: 0,
        daysRemaining: null,
        nextTier: null,
        daysToNextTier: null,
        ...overrides,
    };
}

export function buildTierRecord(overrides: Partial<TierRecord> = {}): TierRecord {
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
        tier: buildTierRecord(),
        startedAt: Temporal.PlainDateTime.from("2026-11-01T01:00:00"),
        expiresAt: Temporal.PlainDateTime.from("2026-12-01T01:00:00"),
        ...overrides,
    };
}

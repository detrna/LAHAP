import type { Membership, MembershipOverview } from "../../domain/membership.domain.js";
import type { Tier } from "../../domain/tier.domain.js";

export function buildTier(overrides: Partial<Tier> = {}): Tier {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        name: "Gold",
        requiredSubscriptionDays: 0,
        durationDays: 30,
        discountPercent: 0,
        photoKey: null,
        photoUrl: null,
        createdAt: "2026-11-03T00:00:00.000Z",
        updatedAt: "2026-11-03T00:00:00.000Z",
        ...overrides,
    };
}

export function buildMembership(overrides: Partial<Membership> = {}): Membership {
    return {
        tierId: "00000000-0000-4000-8000-000000000001",
        startedAt: "2026-11-03T00:00:00.000Z",
        expiresAt: "2026-11-03T00:00:00.000Z",
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

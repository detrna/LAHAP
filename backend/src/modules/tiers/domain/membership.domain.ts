import type { Tier } from "./tier.domain.js";

export interface Membership {
    readonly tierId: string;
    readonly tier?: Tier | undefined;
    readonly startedAt: string;
    readonly expiresAt: string;
    readonly isActive: boolean;
}

export interface MembershipOverview {
    readonly membership: Membership | null;
    readonly subscriptionDays: number;
    readonly daysRemaining: number | null;
    readonly nextTier: Tier | null;
    readonly daysToNextTier: number | null;
}

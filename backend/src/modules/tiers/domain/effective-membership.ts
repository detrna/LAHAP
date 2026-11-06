import { lowerTier, type TierThreshold } from "./qualifying-tier.js";

export interface WindowTier extends TierThreshold {
    readonly durationDays: number;
}

export interface MembershipWindow<T extends WindowTier> {
    readonly tier: T;
    readonly startedAt: Temporal.PlainDateTime;
    readonly expiresAt: Temporal.PlainDateTime;
}

export interface EffectiveMembership<T extends WindowTier> extends MembershipWindow<T> {
    readonly isActive: boolean;
}

export function effectiveMembership<T extends WindowTier>(
    stored: MembershipWindow<T>,
    tiers: readonly T[],
    now: Temporal.PlainDateTime,
): EffectiveMembership<T> {
    let { tier, startedAt, expiresAt } = stored;

    while (Temporal.PlainDateTime.compare(now, expiresAt) >= 0) {
        const lower = lowerTier(tiers, tier);
        if (lower === null) break;
        tier = lower;
        startedAt = expiresAt;
        expiresAt = startedAt.add({ days: lower.durationDays });
    }

    return { tier, startedAt, expiresAt, isActive: Temporal.PlainDateTime.compare(now, expiresAt) < 0 };
}

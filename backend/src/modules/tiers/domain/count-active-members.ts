import { effectiveMembership, type WindowTier } from "./effective-membership.js";

export interface StoredMembershipWindow {
    readonly tierId: string;
    readonly startedAt: Temporal.PlainDateTime;
    readonly expiresAt: Temporal.PlainDateTime;
}

export function countActiveMembers<T extends WindowTier & { readonly id: string }>(
    windows: readonly StoredMembershipWindow[],
    tiers: readonly T[],
    now: Temporal.PlainDateTime,
): Map<string, number> {
    const tierById = new Map(tiers.map(tier => [tier.id, tier]));
    const counts = new Map<string, number>();

    for (const window of windows) {
        const tier = tierById.get(window.tierId);
        if (tier === undefined) continue;
        const effective = effectiveMembership({ tier, ...window }, tiers, now);
        if (!effective.isActive) continue;
        counts.set(effective.tier.id, (counts.get(effective.tier.id) ?? 0) + 1);
    }
    return counts;
}

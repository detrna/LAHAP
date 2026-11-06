export interface TierThreshold {
    readonly requiredSubscriptionDays: number;
}

export function qualifyingTier<T extends TierThreshold>(tiers: readonly T[], days: number): T | null {
    if (days <= 0) return null;

    let best: T | null = null;
    for (const tier of tiers) {
        if (tier.requiredSubscriptionDays > days) continue;
        if (best === null || tier.requiredSubscriptionDays > best.requiredSubscriptionDays) best = tier;
    }
    return best;
}

export function nextTier<T extends TierThreshold>(
    tiers: readonly T[],
    days: number,
    currentTier: TierThreshold | null,
): T | null {
    const floor = Math.max(days, currentTier?.requiredSubscriptionDays ?? days);

    let best: T | null = null;
    for (const tier of tiers) {
        if (tier.requiredSubscriptionDays <= floor) continue;
        if (best === null || tier.requiredSubscriptionDays < best.requiredSubscriptionDays) best = tier;
    }
    return best;
}

export function lowerTier<T extends TierThreshold>(tiers: readonly T[], tier: TierThreshold): T | null {
    let best: T | null = null;
    for (const candidate of tiers) {
        if (candidate.requiredSubscriptionDays >= tier.requiredSubscriptionDays) continue;
        if (best === null || candidate.requiredSubscriptionDays > best.requiredSubscriptionDays) best = candidate;
    }
    return best;
}

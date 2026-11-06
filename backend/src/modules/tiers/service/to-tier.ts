import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Tier } from "../domain/tier.domain.js";
import type { TierRecord } from "./interfaces/tiers.repository.js";

export interface TierStats {
    readonly memberCount: number;
    readonly totalDiscountGiven: number;
}

export function toTier(record: TierRecord, photoUrl: string | null, stats?: TierStats): Tier {
    return {
        id: record.id,
        name: record.name,
        description: record.description,
        requiredSubscriptionDays: record.requiredSubscriptionDays,
        durationDays: record.durationDays,
        discountPercent: record.discountPercent,
        photoKey: record.photoKey,
        photoUrl,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
        ...(stats !== undefined ? stats : {}),
    };
}

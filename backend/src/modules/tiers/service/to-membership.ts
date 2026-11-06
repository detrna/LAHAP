import { toPhotoUrl } from "../../../shared/media/photo.js";
import { toDbTimestamp, toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Membership } from "../domain/membership.domain.js";
import type { Tier } from "../domain/tier.domain.js";
import type { MembershipRecord, TierRecord } from "./interfaces/tiers.repository.js";
import type { TiersService } from "./tiers.service.js";

export async function toTier(this: TiersService, record: TierRecord): Promise<Tier> {
    return {
        id: record.id,
        name: record.name,
        description: record.description,
        requiredSubscriptionDays: record.requiredSubscriptionDays,
        durationDays: record.durationDays,
        discountPercent: record.discountPercent,
        photoKey: record.photoKey,
        photoUrl: await toPhotoUrl(this.objectStorage, record.photoKey),
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}

export async function toMembership(this: TiersService, record: MembershipRecord): Promise<Membership> {
    const now = toDbTimestamp(this.clock.now());
    return {
        tierId: record.tierId,
        tier: await this.toTier(record.tier),
        startedAt: toIsoTimestamp(record.startedAt),
        expiresAt: toIsoTimestamp(record.expiresAt),
        isActive: Temporal.PlainDateTime.compare(record.expiresAt, now) > 0,
    };
}

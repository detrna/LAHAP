import { toPhotoUrl } from "../../../shared/media/photo.js";
import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { EffectiveMembership } from "../domain/effective-membership.js";
import type { Membership } from "../domain/membership.domain.js";
import type { TierRecord } from "./interfaces/tiers.repository.js";
import { toTier } from "./to-tier.js";
import type { TiersService } from "./tiers.service.js";

export async function toMembership(
    this: TiersService,
    effective: EffectiveMembership<TierRecord>,
): Promise<Membership> {
    const photoUrl = await toPhotoUrl(this.objectStorage, effective.tier.photoKey);
    return {
        tierId: effective.tier.id,
        tier: toTier(effective.tier, photoUrl),
        startedAt: toIsoTimestamp(effective.startedAt),
        expiresAt: toIsoTimestamp(effective.expiresAt),
        isActive: effective.isActive,
    };
}

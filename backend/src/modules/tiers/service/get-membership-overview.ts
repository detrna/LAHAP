import { toPhotoUrl } from "../../../shared/media/photo.js";
import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { daysRemaining } from "../domain/days-remaining.js";
import { effectiveMembership } from "../domain/effective-membership.js";
import type { MembershipOverview } from "../domain/membership.domain.js";
import { nextTier } from "../domain/qualifying-tier.js";
import type { TiersService } from "./tiers.service.js";
import { toTier } from "./to-tier.js";

export async function getMembershipOverview(this: TiersService, userId: string): Promise<MembershipOverview> {
    const [stored, tiers, subscriptionDays] = await Promise.all([
        this.tiersRepository.findMembershipByUserId(userId),
        this.tiersRepository.listAllTiers(),
        this.orderStats.countPaidServiceDays(userId),
    ]);

    const now = this.clock.now();
    const effective = stored === null ? null : effectiveMembership(stored, tiers, toDbTimestamp(now));
    const upcoming = nextTier(tiers, subscriptionDays, effective?.tier ?? null);

    return {
        membership: effective === null ? null : await this.toMembership(effective),
        subscriptionDays,
        daysRemaining: effective === null ? null : daysRemaining(effective.expiresAt, now),
        nextTier: upcoming === null ? null : toTier(upcoming, await toPhotoUrl(this.objectStorage, upcoming.photoKey)),
        daysToNextTier: upcoming === null ? null : upcoming.requiredSubscriptionDays - subscriptionDays,
    };
}

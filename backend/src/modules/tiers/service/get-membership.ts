import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { effectiveMembership } from "../domain/effective-membership.js";
import type { Membership } from "../domain/membership.domain.js";
import type { TiersService } from "./tiers.service.js";

export async function getMembership(this: TiersService, userId: string): Promise<Membership | null> {
    const stored = await this.tiersRepository.findMembershipByUserId(userId);
    if (stored === null) return null;

    const tiers = await this.tiersRepository.listAllTiers();
    return this.toMembership(effectiveMembership(stored, tiers, toDbTimestamp(this.clock.now())));
}

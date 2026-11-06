import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { effectiveMembership } from "../domain/effective-membership.js";
import type { TiersService } from "./tiers.service.js";

export interface ActiveDiscount {
    readonly tierId: string;
    readonly discountPercent: number;
}

export async function getActiveDiscount(this: TiersService, userId: string): Promise<ActiveDiscount | null> {
    const stored = await this.tiersRepository.findMembershipByUserId(userId);
    if (stored === null) return null;

    const tiers = await this.tiersRepository.listAllTiers();
    const { tier, isActive } = effectiveMembership(stored, tiers, toDbTimestamp(this.clock.now()));
    if (!isActive || tier.discountPercent <= 0) return null;
    return { tierId: tier.id, discountPercent: tier.discountPercent };
}

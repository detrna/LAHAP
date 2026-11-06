import type { Membership } from "../domain/membership.domain.js";
import type { TiersService } from "./tiers.service.js";

export async function getMembership(this: TiersService, userId: string): Promise<Membership | null> {
    const record = await this.tiersRepository.findMembershipByUserId(userId);
    return record === null ? null : this.toMembership(record);
}

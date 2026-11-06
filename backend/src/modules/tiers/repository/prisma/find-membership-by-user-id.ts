import type { MembershipRecord } from "../../service/interfaces/tiers.repository.js";
import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";
import { toTierRecord } from "./to-tier-record.js";

export async function findMembershipByUserId(
    this: PrismaTiersRepository,
    userId: string,
): Promise<MembershipRecord | null> {
    try {
        const row = await this.orm.public.Membership.where({ userId }).include("tier").first();
        if (row === null) return null;
        return {
            tierId: row.tierId,
            tier: toTierRecord(row.tier),
            startedAt: row.startedAt,
            expiresAt: row.expiresAt,
        };
    } catch (cause) {
        throw new TiersRepositoryFailureError("findMembershipByUserId", cause);
    }
}

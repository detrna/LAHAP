import { fromNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import type { MembershipRecord } from "../../service/interfaces/tiers.repository.js";
import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";

export async function findMembershipByUserId(
    this: PrismaTiersRepository,
    userId: string,
): Promise<MembershipRecord | null> {
    try {
        const row = await this.db.orm.public.Membership.where({ userId }).include("tier").first();
        if (row === null) return null;
        return {
            tierId: row.tierId,
            tier: {
                id: row.tier.id,
                name: row.tier.name,
                description: row.tier.description,
                requiredSubscriptionDays: row.tier.requiredSubscriptionDays,
                durationDays: row.tier.durationDays,
                discountPercent: fromNumeric(row.tier.discountPercent),
                photoKey: row.tier.photoKey,
                createdAt: row.tier.createdAt,
                updatedAt: row.tier.updatedAt,
            },
            startedAt: row.startedAt,
            expiresAt: row.expiresAt,
        };
    } catch (cause) {
        throw new TiersRepositoryFailureError("findMembershipByUserId", cause);
    }
}

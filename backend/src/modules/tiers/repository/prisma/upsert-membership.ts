import type { MembershipUpsert } from "../../service/interfaces/tiers.repository.js";
import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";

export async function upsertMembership(this: PrismaTiersRepository, membership: MembershipUpsert): Promise<void> {
    const { userId, tierId, startedAt, expiresAt } = membership;
    try {
        await this.orm.public.Membership.select("id").upsert({
            create: { userId, tierId, startedAt, expiresAt },
            update: { tierId, startedAt, expiresAt },
            conflictOn: { userId },
        });
    } catch (cause) {
        throw new TiersRepositoryFailureError("upsertMembership", cause);
    }
}

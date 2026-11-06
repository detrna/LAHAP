import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";

export async function deleteTier(this: PrismaTiersRepository, id: string): Promise<boolean> {
    try {
        return await this.db.transaction(async tx => {
            const tier = await tx.orm.public.Tier.where({ id })
                .select("id", "requiredSubscriptionDays")
                .forUpdate()
                .first();
            if (tier === null) return false;

            const previous = await tx.orm.public.Tier.where(candidate =>
                candidate.requiredSubscriptionDays.lt(tier.requiredSubscriptionDays),
            )
                .select("id")
                .orderBy([candidate => candidate.requiredSubscriptionDays.desc()])
                .first();

            if (previous === null) {
                await tx.orm.public.Membership.where({ tierId: id }).deleteAndCount();
            } else {
                await tx.orm.public.Membership.where({ tierId: id }).updateAndCount({ tierId: previous.id });
            }
            await tx.orm.public.Tier.where({ id }).deleteAndCount();
            return true;
        });
    } catch (cause) {
        throw new TiersRepositoryFailureError("deleteTier", cause);
    }
}

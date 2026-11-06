import type { TierRecord } from "../../service/interfaces/tiers.repository.js";
import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";
import { toTierRecord } from "./to-tier-record.js";

export async function listAllTiers(this: PrismaTiersRepository): Promise<readonly TierRecord[]> {
    try {
        const rows = await this.orm.public.Tier.orderBy([tier => tier.requiredSubscriptionDays.asc()]).all();
        return rows.map(toTierRecord);
    } catch (cause) {
        throw new TiersRepositoryFailureError("listAllTiers", cause);
    }
}

import type { TierRecord } from "../../service/interfaces/tiers.repository.js";
import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";
import { toTierRecord } from "./to-tier-record.js";

export async function findTierById(this: PrismaTiersRepository, id: string): Promise<TierRecord | null> {
    try {
        const row = await this.orm.public.Tier.where({ id }).first();
        return row === null ? null : toTierRecord(row);
    } catch (cause) {
        throw new TiersRepositoryFailureError("findTierById", cause);
    }
}

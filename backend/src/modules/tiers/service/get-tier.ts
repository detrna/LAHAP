import type { Tier } from "../domain/tier.domain.js";
import { TierNotFoundError } from "./interfaces/tiers.repository.js";
import type { TiersService } from "./tiers.service.js";

export async function getTier(this: TiersService, id: string): Promise<Tier> {
    const record = await this.tiersRepository.findTierById(id);
    if (record === null) throw new TierNotFoundError(id);
    return this.presentTier(record);
}

import type { Tier } from "../domain/tier.domain.js";
import { TierNotFoundError, type TierChanges } from "./interfaces/tiers.repository.js";
import type { TiersService } from "./tiers.service.js";

export type UpdateTierInput = TierChanges;

export async function updateTier(this: TiersService, id: string, input: UpdateTierInput): Promise<Tier> {
    const existing = await this.tiersRepository.findTierById(id);
    if (existing === null) throw new TierNotFoundError(id);

    if (input.photoKey !== undefined && input.photoKey !== null && input.photoKey !== existing.photoKey) {
        await this.photoKeys.assertPhotoKeyExists(input.photoKey, "photoKey");
    }

    const record = await this.tiersRepository.updateTier(id, input);
    if (record === null) throw new TierNotFoundError(id);
    return this.presentTier(record);
}

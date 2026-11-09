import { toPhotoUrls } from "../../../shared/media/photo.js";
import type { Tier } from "../domain/tier.domain.js";
import { toTier } from "./to-tier.js";
import type { TiersService } from "./tiers.service.js";

export async function listPublicTiers(this: TiersService): Promise<readonly Tier[]> {
    const records = await this.tiersRepository.listAllTiers();
    if (records.length === 0) return [];

    const photoUrls = await toPhotoUrls(
        this.objectStorage,
        records.map(record => record.photoKey),
    );
    return records.map((record, index) => toTier(record, photoUrls[index] ?? null));
}

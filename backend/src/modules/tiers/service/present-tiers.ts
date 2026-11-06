import { toPhotoUrls } from "../../../shared/media/photo.js";
import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { countActiveMembers } from "../domain/count-active-members.js";
import type { Tier } from "../domain/tier.domain.js";
import type { TierRecord } from "./interfaces/tiers.repository.js";
import { toTier } from "./to-tier.js";
import type { TiersService } from "./tiers.service.js";

export async function presentTiers(this: TiersService, records: readonly TierRecord[]): Promise<Tier[]> {
    if (records.length === 0) return [];

    const now = toDbTimestamp(this.clock.now());
    const [allTiers, windows, discounts, photoUrls] = await Promise.all([
        this.tiersRepository.listAllTiers(),
        this.tiersRepository.listMembershipWindows(),
        this.orderStats.sumTierDiscounts(records.map(record => record.id)),
        toPhotoUrls(
            this.objectStorage,
            records.map(record => record.photoKey),
        ),
    ]);
    const memberCounts = countActiveMembers(windows, allTiers, now);

    return records.map((record, index) =>
        toTier(record, photoUrls[index] ?? null, {
            memberCount: memberCounts.get(record.id) ?? 0,
            totalDiscountGiven: discounts.get(record.id) ?? 0,
        }),
    );
}

export async function presentTier(this: TiersService, record: TierRecord): Promise<Tier> {
    const [tier] = await this.presentTiers([record]);
    if (tier === undefined) throw new Error(`tier ${record.id} missing from its own presentation`);
    return tier;
}

import type { SeedContext } from "../../seed-context.js";
import { TIERS, tierPhotoKey } from "./tiers.data.js";

export async function seedTiers({ tx, logger }: SeedContext): Promise<number> {
    const tiers = Object.values(TIERS);
    for (const tier of tiers) {
        const { id, ...fields } = tier;
        const row = { ...fields, photoKey: tierPhotoKey(id) };
        await tx.orm.public.Tier.upsert({ create: { id, ...row }, update: row });
        logger.info(
            {
                id,
                name: tier.name,
                requiredSubscriptionDays: tier.requiredSubscriptionDays,
                discountPercent: tier.discountPercent,
            },
            "upserted tier",
        );
    }
    return tiers.length;
}

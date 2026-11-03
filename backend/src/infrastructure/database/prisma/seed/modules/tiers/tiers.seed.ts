import type { SeedContext } from "../../seed-context.js";
import { TIERS } from "./tiers.data.js";

export async function seedTiers({ tx, logger }: SeedContext): Promise<number> {
    for (const tier of TIERS) {
        const { id, ...fields } = tier;
        await tx.orm.public.Tier.upsert({ create: tier, update: fields });
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
    return TIERS.length;
}

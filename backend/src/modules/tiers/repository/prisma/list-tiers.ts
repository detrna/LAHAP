import type { TierListQuery, TierListRecord } from "../../service/interfaces/tiers.repository.js";
import { TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";
import { toTierRecord } from "./to-tier-record.js";

export async function listTiers(this: PrismaTiersRepository, query: TierListQuery): Promise<TierListRecord> {
    try {
        const [rows, totals] = await Promise.all([
            this.orm.public.Tier.orderBy([tier => tier.requiredSubscriptionDays.asc(), tier => tier.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            this.orm.public.Tier.aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toTierRecord), total: totals.total };
    } catch (cause) {
        throw new TiersRepositoryFailureError("listTiers", cause);
    }
}

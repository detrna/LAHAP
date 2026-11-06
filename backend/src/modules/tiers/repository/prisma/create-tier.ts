import { toNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import type { NewTierRecord, TierRecord } from "../../service/interfaces/tiers.repository.js";
import { TierAlreadyExistsError, TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";
import { toTierRecord } from "./to-tier-record.js";
import { getUniqueTierField } from "./unique-violation.js";

export async function createTier(this: PrismaTiersRepository, record: NewTierRecord): Promise<TierRecord> {
    try {
        const row = await this.orm.public.Tier.create({
            name: record.name,
            description: record.description,
            requiredSubscriptionDays: record.requiredSubscriptionDays,
            durationDays: record.durationDays,
            discountPercent: toNumeric(record.discountPercent, 2),
            photoKey: record.photoKey,
        });
        return toTierRecord(row);
    } catch (cause) {
        const field = getUniqueTierField(cause);
        if (field !== null) throw new TierAlreadyExistsError(field, { cause });
        throw new TiersRepositoryFailureError("createTier", cause);
    }
}

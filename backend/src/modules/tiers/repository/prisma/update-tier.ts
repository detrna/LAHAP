import { toNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import type { TierChanges, TierRecord } from "../../service/interfaces/tiers.repository.js";
import { TierAlreadyExistsError, TiersRepositoryFailureError } from "../../service/interfaces/tiers.repository.js";
import type { PrismaTiersRepository } from "./tiers-repository.js";
import { toTierRecord } from "./to-tier-record.js";
import { getUniqueTierField } from "./unique-violation.js";

function toTierColumns(changes: TierChanges) {
    return {
        ...(changes.name !== undefined ? { name: changes.name } : {}),
        ...(changes.description !== undefined ? { description: changes.description } : {}),
        ...(changes.requiredSubscriptionDays !== undefined
            ? { requiredSubscriptionDays: changes.requiredSubscriptionDays }
            : {}),
        ...(changes.durationDays !== undefined ? { durationDays: changes.durationDays } : {}),
        ...(changes.discountPercent !== undefined ? { discountPercent: toNumeric(changes.discountPercent, 2) } : {}),
        ...(changes.photoKey !== undefined ? { photoKey: changes.photoKey } : {}),
    };
}

export async function updateTier(
    this: PrismaTiersRepository,
    id: string,
    changes: TierChanges,
): Promise<TierRecord | null> {
    try {
        const columns = toTierColumns(changes);
        const target = this.orm.public.Tier.where({ id });
        const row = Object.keys(columns).length > 0 ? await target.update(columns) : await target.first();
        return row === null ? null : toTierRecord(row);
    } catch (cause) {
        const field = getUniqueTierField(cause);
        if (field !== null) throw new TierAlreadyExistsError(field, { cause });
        throw new TiersRepositoryFailureError("updateTier", cause);
    }
}

import { fromNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import type { TierRecord } from "../../service/interfaces/tiers.repository.js";

export interface TierRow {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
    readonly requiredSubscriptionDays: number;
    readonly durationDays: number;
    readonly discountPercent: string;
    readonly photoKey: string | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export function toTierRecord(row: TierRow): TierRecord {
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        requiredSubscriptionDays: row.requiredSubscriptionDays,
        durationDays: row.durationDays,
        discountPercent: fromNumeric(row.discountPercent),
        photoKey: row.photoKey,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

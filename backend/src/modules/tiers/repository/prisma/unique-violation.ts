import { getUniqueViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import type { TierUniqueField } from "../../domain/errors.js";

const FIELD_BY_CONSTRAINT: Record<string, TierUniqueField> = {
    tier_name_key: "name",
    tier_required_subscription_days_key: "requiredSubscriptionDays",
};

export function getUniqueTierField(error: unknown): TierUniqueField | null {
    const constraint = getUniqueViolationConstraint(error);
    return constraint === null ? null : (FIELD_BY_CONSTRAINT[constraint] ?? null);
}

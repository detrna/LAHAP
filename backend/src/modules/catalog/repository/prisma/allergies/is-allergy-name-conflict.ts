import { getUniqueViolationConstraint } from "../../../../../infrastructure/database/prisma/sql-errors.js";

export function isAllergyNameConflict(error: unknown): boolean {
    return getUniqueViolationConstraint(error) === "allergy_name_key";
}

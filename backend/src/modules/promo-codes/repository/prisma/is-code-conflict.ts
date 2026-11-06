import { getUniqueViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";

export function isCodeConflict(error: unknown): boolean {
    return getUniqueViolationConstraint(error) === "promo_code_code_key";
}

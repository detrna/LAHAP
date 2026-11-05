import { getUniqueViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import type { UniqueUserField } from "../../domain/errors.js";

const UNIQUE_FIELDS: Readonly<Record<string, UniqueUserField>> = {
    user_phone_key: "phone",
    user_email_key: "email",
};

export function getUniqueUserField(error: unknown): UniqueUserField | null {
    const constraint = getUniqueViolationConstraint(error);
    return constraint === null ? null : (UNIQUE_FIELDS[constraint] ?? null);
}

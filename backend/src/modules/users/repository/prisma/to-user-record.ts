import { fromNumericOrNull } from "../../../../infrastructure/database/prisma/numeric.js";
import { isRole } from "../../../../shared/auth/roles.js";
import type { UserRecord } from "../../service/interfaces/users.repository.js";

interface AllergyRow {
    readonly id: string;
    readonly name: string;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface UserRow {
    readonly id: string;
    readonly name: string;
    readonly email: string | null;
    readonly phone: string;
    readonly role: string;
    readonly address: string | null;
    readonly latitude: string | null;
    readonly longitude: string | null;
    readonly allergyNote: string | null;
    readonly isActive: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
    readonly allergies: readonly { readonly allergy: AllergyRow }[];
}

export function toUserRecord(row: UserRow): UserRecord {
    if (!isRole(row.role)) {
        throw new Error(`unknown role "${row.role}" on user ${row.id}`);
    }

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        role: row.role,
        address: row.address,
        latitude: fromNumericOrNull(row.latitude),
        longitude: fromNumericOrNull(row.longitude),
        allergyNote: row.allergyNote,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        allergies: row.allergies
            .map(({ allergy }) => ({
                id: allergy.id,
                name: allergy.name,
                createdAt: allergy.createdAt,
                updatedAt: allergy.updatedAt,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
    };
}

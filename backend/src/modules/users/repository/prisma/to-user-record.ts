import { fromNumericOrNull } from "../../../../infrastructure/database/prisma/numeric.js";
import { isRole } from "../../../../shared/auth/roles.js";
import type { UserRecord } from "../../service/interfaces/users.repository.js";

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
    readonly allergies: readonly { readonly allergyId: string }[];
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
        allergyIds: row.allergies.map(link => link.allergyId),
    };
}

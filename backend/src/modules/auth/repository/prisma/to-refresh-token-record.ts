import type { RefreshTokenRecord } from "../../service/interfaces/auth.repository.js";

export interface RefreshTokenRow {
    readonly id: string;
    readonly userId: string;
    readonly expiresAt: Temporal.PlainDateTime;
    readonly revokedAt: Temporal.PlainDateTime | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export function toRefreshTokenRecord(row: RefreshTokenRow): RefreshTokenRecord {
    return {
        id: row.id,
        userId: row.userId,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

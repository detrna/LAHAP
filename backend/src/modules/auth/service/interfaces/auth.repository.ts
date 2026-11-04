export * from "../../domain/errors.js";

export interface RefreshTokenRecord {
    readonly id: string;
    readonly userId: string;
    readonly expiresAt: Temporal.PlainDateTime;
    readonly revokedAt: Temporal.PlainDateTime | null;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface NewRefreshTokenRecord {
    readonly id: string;
    readonly userId: string;
    readonly expiresAt: Temporal.PlainDateTime;
}

export interface AuthRepository {
    createRefreshToken(token: NewRefreshTokenRecord): Promise<RefreshTokenRecord>;
    findRefreshToken(id: string): Promise<RefreshTokenRecord | null>;
    revokeRefreshToken(id: string, revokedAt: Temporal.PlainDateTime): Promise<boolean>;
    revokeRefreshTokensOfUser(userId: string, revokedAt: Temporal.PlainDateTime): Promise<number>;
}

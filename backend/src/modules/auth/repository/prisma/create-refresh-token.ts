import type { NewRefreshTokenRecord, RefreshTokenRecord } from "../../service/interfaces/auth.repository.js";
import { AuthRepositoryFailureError } from "../../service/interfaces/auth.repository.js";
import type { PrismaAuthRepository } from "./auth-repository.js";
import { toRefreshTokenRecord } from "./to-refresh-token-record.js";

export async function createRefreshToken(
    this: PrismaAuthRepository,
    token: NewRefreshTokenRecord,
): Promise<RefreshTokenRecord> {
    try {
        const row = await this.db.orm.public.RefreshToken.create({
            id: token.id,
            userId: token.userId,
            expiresAt: token.expiresAt,
        });
        return toRefreshTokenRecord(row);
    } catch (cause) {
        throw new AuthRepositoryFailureError("createRefreshToken", cause);
    }
}

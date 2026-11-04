import { AuthRepositoryFailureError } from "../../service/interfaces/auth.repository.js";
import type { PrismaAuthRepository } from "./auth-repository.js";

export async function revokeRefreshToken(
    this: PrismaAuthRepository,
    id: string,
    revokedAt: Temporal.PlainDateTime,
): Promise<boolean> {
    try {
        const revoked = await this.db.orm.public.RefreshToken.where({ id })
            .where(token => token.revokedAt.isNull())
            .updateAndCount({ revokedAt });
        return revoked > 0;
    } catch (cause) {
        throw new AuthRepositoryFailureError("revokeRefreshToken", cause);
    }
}

export async function revokeRefreshTokensOfUser(
    this: PrismaAuthRepository,
    userId: string,
    revokedAt: Temporal.PlainDateTime,
): Promise<number> {
    try {
        return await this.db.orm.public.RefreshToken.where({ userId })
            .where(token => token.revokedAt.isNull())
            .updateAndCount({ revokedAt });
    } catch (cause) {
        throw new AuthRepositoryFailureError("revokeRefreshTokensOfUser", cause);
    }
}

import type { RefreshTokenRecord } from "../../service/interfaces/auth.repository.js";
import { AuthRepositoryFailureError } from "../../service/interfaces/auth.repository.js";
import type { PrismaAuthRepository } from "./auth-repository.js";
import { toRefreshTokenRecord } from "./to-refresh-token-record.js";

export async function findRefreshToken(this: PrismaAuthRepository, id: string): Promise<RefreshTokenRecord | null> {
    try {
        const row = await this.db.orm.public.RefreshToken.where({ id }).first();
        return row === null ? null : toRefreshTokenRecord(row);
    } catch (cause) {
        throw new AuthRepositoryFailureError("findRefreshToken", cause);
    }
}

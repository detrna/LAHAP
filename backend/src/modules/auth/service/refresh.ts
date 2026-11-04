import { InvalidTokenError } from "../../../shared/ports/token-provider/token-provider.js";
import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import type { AuthSession } from "../domain/auth.domain.js";
import type { AuthService } from "./auth.service.js";

export interface RefreshInput {
    readonly refreshToken: string;
}

export async function refresh(this: AuthService, input: RefreshInput): Promise<AuthSession> {
    const payload = this.tokenProvider.verifyRefreshToken(input.refreshToken);
    const now = toDbTimestamp(this.clock.now());

    const rotated = await this.authRepository.revokeRefreshToken(payload.jti, now);
    if (!rotated) {
        if ((await this.authRepository.findRefreshToken(payload.jti)) !== null) {
            await this.authRepository.revokeRefreshTokensOfUser(payload.sub.userId, now);
            throw new InvalidTokenError("refresh token has been revoked");
        }
        throw new InvalidTokenError("refresh token is no longer valid");
    }

    const user = await this.userAccounts.getActiveById(payload.sub.userId);
    if (user === null) {
        throw new InvalidTokenError("refresh token is no longer valid");
    }
    return this.createSession(user);
}

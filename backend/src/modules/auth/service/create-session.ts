import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import type { User } from "../../users/domain/user.domain.js";
import type { AuthSession } from "../domain/auth.domain.js";
import type { AuthService } from "./auth.service.js";

export async function createSession(this: AuthService, user: User): Promise<AuthSession> {
    const pair = this.tokenProvider.signTokenPair({ sub: { userId: user.id, name: user.name }, role: user.role });
    await this.authRepository.createRefreshToken({
        id: pair.refreshTokenId,
        userId: user.id,
        expiresAt: toDbTimestamp(this.clock.now().add({ seconds: pair.refreshExpiresIn })),
    });
    return {
        accessToken: pair.accessToken,
        refreshToken: pair.refreshToken,
        tokenType: "Bearer",
        expiresIn: pair.expiresIn,
        refreshExpiresIn: pair.refreshExpiresIn,
        user,
    };
}

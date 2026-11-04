import { InvalidTokenError, type VerifiedTokenPayload } from "../../../shared/ports/token-provider/token-provider.js";
import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import type { AuthService } from "./auth.service.js";

export interface LogoutInput {
    readonly refreshToken: string;
}

export async function logout(this: AuthService, input: LogoutInput): Promise<void> {
    let payload: VerifiedTokenPayload;
    try {
        payload = this.tokenProvider.verifyRefreshToken(input.refreshToken);
    } catch (error) {
        if (error instanceof InvalidTokenError) return;
        throw error;
    }
    await this.authRepository.revokeRefreshToken(payload.jti, toDbTimestamp(this.clock.now()));
}

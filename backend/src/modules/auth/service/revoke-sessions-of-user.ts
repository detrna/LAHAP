import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import type { AuthService } from "./auth.service.js";

export async function revokeSessionsOfUser(this: AuthService, userId: string): Promise<void> {
    await this.authRepository.revokeRefreshTokensOfUser(userId, toDbTimestamp(this.clock.now()));
}

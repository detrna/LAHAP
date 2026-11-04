import { describe, expect, it } from "vitest";
import { setupAuthService } from "../test-utils/setup/auth.setup.js";

describe("AuthService.createSession (unit)", () => {
    it("signs a pair for the user and returns it as a Bearer session", async () => {
        const { user, tokenProvider, service } = setupAuthService();

        const session = await service.createSession(user);

        expect(session).toMatchObject({ tokenType: "Bearer", expiresIn: 3600, refreshExpiresIn: 7 * 24 * 3600, user });
        expect(tokenProvider.verifyAccessToken(session.accessToken).sub.userId).toBe(user.id);
    });

    it("stores the refresh token's jti with its expiry in UTC", async () => {
        const { user, authRepository, tokenProvider, service } = setupAuthService();

        const session = await service.createSession(user);

        expect(authRepository.createRefreshToken).toHaveBeenCalledWith({
            id: tokenProvider.verifyRefreshToken(session.refreshToken).jti,
            userId: user.id,
            expiresAt: Temporal.PlainDateTime.from("2026-11-10T01:00:00"),
        });
    });
});

import { describe, expect, it } from "vitest";
import { createExpiredRefreshToken } from "../../../../tests/utils/factory/jwt/jwt.js";
import { setupAuthService } from "../test-utils/setup/auth.setup.js";

describe("AuthService.logout (unit)", () => {
    it("revokes the presented refresh token", async () => {
        const { user, authRepository, tokenProvider, service } = setupAuthService();
        const refreshToken = tokenProvider.signRefreshToken({
            sub: { userId: user.id, name: "Rina" },
            role: "CUSTOMER",
        });

        await service.logout({ refreshToken });

        expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(
            tokenProvider.verifyRefreshToken(refreshToken).jti,
            Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        );
    });

    it("does nothing for a token that is already revoked", async () => {
        const { user, authRepository, tokenProvider, service } = setupAuthService();
        authRepository.revokeRefreshToken.mockResolvedValue(false);
        const refreshToken = tokenProvider.signRefreshToken({
            sub: { userId: user.id, name: "Rina" },
            role: "CUSTOMER",
        });

        await expect(service.logout({ refreshToken })).resolves.toBeUndefined();
        expect(authRepository.revokeRefreshTokensOfUser).not.toHaveBeenCalled();
    });

    it.each([
        ["an expired token", createExpiredRefreshToken()],
        ["a malformed token", "not-a-jwt"],
    ])("ignores %s", async (_, refreshToken) => {
        const { authRepository, service } = setupAuthService();

        await expect(service.logout({ refreshToken })).resolves.toBeUndefined();
        expect(authRepository.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it("ignores an access token", async () => {
        const { user, authRepository, tokenProvider, service } = setupAuthService();
        const accessToken = tokenProvider.signAccessToken({ sub: { userId: user.id, name: "Rina" }, role: "CUSTOMER" });

        await service.logout({ refreshToken: accessToken });

        expect(authRepository.revokeRefreshToken).not.toHaveBeenCalled();
    });
});

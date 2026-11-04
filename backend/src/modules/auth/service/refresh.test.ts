import { describe, expect, it } from "vitest";
import { createExpiredRefreshToken } from "../../../../tests/utils/factory/jwt/jwt.js";
import { InvalidTokenError, TokenExpiredError } from "../../../shared/ports/token-provider/token-provider.js";
import { buildRefreshTokenRecord } from "../test-utils/factory/auth.factory.js";
import { setupAuthService } from "../test-utils/setup/auth.setup.js";

const REVOKED_AT = Temporal.PlainDateTime.from("2026-11-03T01:00:00");

function setupRefresh() {
    const setup = setupAuthService();
    const refreshToken = setup.tokenProvider.signRefreshToken({
        sub: { userId: setup.user.id, name: "Old Name" },
        role: "CUSTOMER",
    });
    const jti = setup.tokenProvider.verifyRefreshToken(refreshToken).jti;
    return { ...setup, refreshToken, jti };
}

describe("AuthService.refresh (unit)", () => {
    it("issues a new pair carrying the user's current name and role", async () => {
        const { user, userAccounts, tokenProvider, service, refreshToken } = setupRefresh();
        userAccounts.getActiveById.mockResolvedValue({ ...user, name: "New Name", role: "ADMIN" });

        const session = await service.refresh({ refreshToken });

        expect(userAccounts.getActiveById).toHaveBeenCalledWith(user.id);
        expect(tokenProvider.verifyAccessToken(session.accessToken)).toMatchObject({
            sub: { name: "New Name" },
            role: "ADMIN",
        });
    });

    it("revokes the presented token and stores the new one", async () => {
        const { user, userAccounts, authRepository, tokenProvider, service, refreshToken, jti } = setupRefresh();
        userAccounts.getActiveById.mockResolvedValue(user);

        const session = await service.refresh({ refreshToken });

        expect(authRepository.revokeRefreshToken).toHaveBeenCalledWith(jti, REVOKED_AT);
        const newJti = tokenProvider.verifyRefreshToken(session.refreshToken).jti;
        expect(newJti).not.toBe(jti);
        expect(authRepository.createRefreshToken).toHaveBeenCalledWith(expect.objectContaining({ id: newJti }));
    });

    it("revokes every token of the user when a revoked token is presented again", async () => {
        const { user, userAccounts, authRepository, service, refreshToken, jti } = setupRefresh();
        authRepository.revokeRefreshToken.mockResolvedValue(false);
        authRepository.findRefreshToken.mockResolvedValue(
            buildRefreshTokenRecord({ id: jti, userId: user.id, revokedAt: REVOKED_AT }),
        );

        await expect(service.refresh({ refreshToken })).rejects.toMatchObject({
            constructor: InvalidTokenError,
            statusCode: 401,
            message: "refresh token has been revoked",
        });
        expect(authRepository.findRefreshToken).toHaveBeenCalledWith(jti);
        expect(authRepository.revokeRefreshTokensOfUser).toHaveBeenCalledWith(user.id, REVOKED_AT);
        expect(userAccounts.getActiveById).not.toHaveBeenCalled();
        expect(authRepository.createRefreshToken).not.toHaveBeenCalled();
    });

    it("rejects a token that was never stored without revoking the user's other tokens", async () => {
        const { authRepository, service, refreshToken } = setupRefresh();
        authRepository.revokeRefreshToken.mockResolvedValue(false);

        await expect(service.refresh({ refreshToken })).rejects.toMatchObject({
            constructor: InvalidTokenError,
            message: "refresh token is no longer valid",
        });
        expect(authRepository.revokeRefreshTokensOfUser).not.toHaveBeenCalled();
    });

    it("rejects the token when the user is gone or inactive", async () => {
        const { authRepository, service, refreshToken } = setupRefresh();

        await expect(service.refresh({ refreshToken })).rejects.toMatchObject({
            constructor: InvalidTokenError,
            statusCode: 401,
        });
        expect(authRepository.createRefreshToken).not.toHaveBeenCalled();
    });

    it("rejects an access token used as a refresh token", async () => {
        const { user, userAccounts, authRepository, tokenProvider, service } = setupAuthService();
        const accessToken = tokenProvider.signAccessToken({ sub: { userId: user.id, name: "Rina" }, role: "CUSTOMER" });

        await expect(service.refresh({ refreshToken: accessToken })).rejects.toBeInstanceOf(InvalidTokenError);
        expect(authRepository.revokeRefreshToken).not.toHaveBeenCalled();
        expect(userAccounts.getActiveById).not.toHaveBeenCalled();
    });

    it("rejects an expired refresh token", async () => {
        const { service } = setupAuthService();

        await expect(service.refresh({ refreshToken: createExpiredRefreshToken() })).rejects.toBeInstanceOf(
            TokenExpiredError,
        );
    });
});

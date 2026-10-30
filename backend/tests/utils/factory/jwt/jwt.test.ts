import { describe, expect, it } from "vitest";
import { TokenExpiredError } from "../../../../src/shared/ports/token-provider/token-provider.js";
import {
    createAccessToken,
    createAuthHeaders,
    createBearerHeader,
    createExpiredAccessToken,
    createExpiredRefreshToken,
    createJwtConfig,
    createRefreshToken,
    createTokenPair,
    createTokenPayload,
    createTokenProvider,
    DEFAULT_TEST_JWT_CONFIG,
    DEFAULT_TEST_PAYLOAD,
} from "./jwt.js";

describe("JWT Factory", () => {
    it("creates default JwtConfig and supports overrides", () => {
        const defaultConfig = createJwtConfig();
        expect(defaultConfig).toEqual(DEFAULT_TEST_JWT_CONFIG);

        const customConfig = createJwtConfig({ ISSUER: "custom-issuer", EXPIRES_IN: "2h" });
        expect(customConfig.ISSUER).toBe("custom-issuer");
        expect(customConfig.EXPIRES_IN).toBe("2h");
        expect(customConfig.SECRET).toBe(DEFAULT_TEST_JWT_CONFIG.SECRET);
    });

    it("creates default TokenPayload and supports partial sub overrides", () => {
        const defaultPayload = createTokenPayload();
        expect(defaultPayload).toEqual(DEFAULT_TEST_PAYLOAD);

        const customPayload = createTokenPayload({
            sub: { userId: "custom-user-99", name: "Custom Name" },
            role: "ADMIN",
        });
        expect(customPayload.sub.userId).toBe("custom-user-99");
        expect(customPayload.sub.name).toBe("Custom Name");
        expect(customPayload.role).toBe("ADMIN");
    });

    it("creates a functional JwtTokenProvider instance", () => {
        const provider = createTokenProvider();
        const token = provider.signAccessToken(DEFAULT_TEST_PAYLOAD);
        const decoded = provider.verifyAccessToken(token);

        expect(decoded.sub).toEqual(DEFAULT_TEST_PAYLOAD.sub);
        expect(decoded.role).toBe(DEFAULT_TEST_PAYLOAD.role);
    });

    it("generates signed access token, refresh token, and token pair directly", () => {
        const provider = createTokenProvider();

        const accessToken = createAccessToken({ role: "MANAGER" });
        const decodedAccess = provider.verifyAccessToken(accessToken);
        expect(decodedAccess.role).toBe("MANAGER");

        const refreshToken = createRefreshToken({ role: "SUPER_ADMIN" });
        const decodedRefresh = provider.verifyRefreshToken(refreshToken);
        expect(decodedRefresh.role).toBe("SUPER_ADMIN");

        const pair = createTokenPair({ role: "EDITOR" });
        expect(pair.accessToken).toBeTruthy();
        expect(pair.refreshToken).toBeTruthy();
        expect(provider.verifyAccessToken(pair.accessToken).role).toBe("EDITOR");
        expect(provider.verifyRefreshToken(pair.refreshToken).role).toBe("EDITOR");
    });

    it("generates expired access tokens that fail verification with TokenExpiredError", () => {
        const provider = createTokenProvider();
        const expiredToken = createExpiredAccessToken();

        expect(() => provider.verifyAccessToken(expiredToken)).toThrow(TokenExpiredError);
    });

    it("generates expired refresh tokens that fail verification with TokenExpiredError", () => {
        const provider = createTokenProvider();
        const expiredRefresh = createExpiredRefreshToken();

        expect(() => provider.verifyRefreshToken(expiredRefresh)).toThrow(TokenExpiredError);
    });

    it("formats Bearer headers and auth header objects correctly", () => {
        const header = createBearerHeader("xyz-token");
        expect(header).toBe("Bearer xyz-token");

        const auth = createAuthHeaders({ role: "GUEST" });
        expect(auth.authorization).toMatch(/^Bearer\s+[\w-]+\.[\w-]+\.[\w-]+$/);
    });
});

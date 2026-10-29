import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { JwtConfig } from "../../../config/jwt.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
    InvalidTokenError,
    InvalidTokenPayloadError,
    TokenExpiredError,
    TokenProviderFailureError,
    type SignTokenPayload,
} from "../../../shared/ports/token-provider/token-provider.js";
import { JwtTokenProvider } from "./jwt.js";

const dummyConfig: JwtConfig = {
    SECRET: "access-secret-key",
    EXPIRES_IN: "1h",
    REFRESH_SECRET: "refresh-secret-key",
    REFRESH_EXPIRES_IN: "7d",
    ALGORITHM: "HS256",
    ISSUER: "gtnic",
    AUDIENCE: "gtnic-users",
};

const validPayload: SignTokenPayload = {
    sub: {
        userId: "user-123",
        name: "Budi Santoso",
    },
    role: "USER",
};

describe("JwtTokenProvider (unit)", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("constructor validation", () => {
        it("throws when JWT_SECRET is empty", () => {
            expect(() => new JwtTokenProvider({ ...dummyConfig, SECRET: "   " })).toThrow(
                "JWT_SECRET is not set",
            );
        });

        it("throws when JWT_EXPIRES_IN is empty", () => {
            expect(() => new JwtTokenProvider({ ...dummyConfig, EXPIRES_IN: "" })).toThrow(
                "JWT_EXPIRES_IN is not set",
            );
        });

        it("throws when JWT_REFRESH_SECRET is empty", () => {
            expect(() => new JwtTokenProvider({ ...dummyConfig, REFRESH_SECRET: "" })).toThrow(
                "JWT_REFRESH_SECRET is not set",
            );
        });

        it("throws when JWT_REFRESH_EXPIRES_IN is empty", () => {
            expect(() => new JwtTokenProvider({ ...dummyConfig, REFRESH_EXPIRES_IN: "" })).toThrow(
                "JWT_REFRESH_EXPIRES_IN is not set",
            );
        });

        it("throws when JWT_ISSUER is empty", () => {
            expect(() => new JwtTokenProvider({ ...dummyConfig, ISSUER: "" })).toThrow(
                "JWT_ISSUER is not set",
            );
        });

        it("throws when JWT_AUDIENCE is empty", () => {
            expect(() => new JwtTokenProvider({ ...dummyConfig, AUDIENCE: "" })).toThrow(
                "JWT_AUDIENCE is not set",
            );
        });

        it("throws when JWT_ALGORITHM is unsupported", () => {
            expect(() => new JwtTokenProvider({ ...dummyConfig, ALGORITHM: "RS256" })).toThrow(
                "Unsupported JWT_ALGORITHM: RS256",
            );
        });
    });

    describe("signAccessToken & verifyAccessToken", () => {
        it("signs and verifies a valid access token with auto-generated jti and registered claims", () => {
            const provider = new JwtTokenProvider(dummyConfig);
            const token = provider.signAccessToken(validPayload);

            const decoded = provider.verifyAccessToken(token);
            expect(decoded.sub).toEqual(validPayload.sub);
            expect(decoded.role).toBe(validPayload.role);
            expect(decoded.jti).toMatch(
                /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            );
            expect(decoded.iss).toBe(dummyConfig.ISSUER);
            expect(decoded.aud).toBe(dummyConfig.AUDIENCE);
            expect(typeof decoded.iat).toBe("number");
            expect(decoded.exp).toBe(decoded.iat + 3600);
        });

        it("preserves a caller-supplied jti when signing", () => {
            const provider = new JwtTokenProvider(dummyConfig);
            const token = provider.signAccessToken({
                ...validPayload,
                jti: "custom-jti-001",
            });

            const decoded = provider.verifyAccessToken(token);
            expect(decoded.jti).toBe("custom-jti-001");
        });

        it("rejects an access token when verified as a refresh token", () => {
            const provider = new JwtTokenProvider(dummyConfig);
            const accessToken = provider.signAccessToken(validPayload);

            expect(() => provider.verifyRefreshToken(accessToken)).toThrow(InvalidTokenError);
        });

        it("throws InvalidTokenPayloadError when sub.userId, sub.name, role, or supplied jti is empty", () => {
            const provider = new JwtTokenProvider(dummyConfig);

            expect(() =>
                provider.signAccessToken({
                    sub: { userId: "   ", name: "Budi" },
                    role: "USER",
                }),
            ).toThrow(InvalidTokenPayloadError);

            expect(() =>
                provider.signAccessToken({
                    sub: { userId: "user-1", name: "" },
                    role: "USER",
                }),
            ).toThrow(InvalidTokenPayloadError);

            expect(() =>
                provider.signAccessToken({
                    sub: { userId: "user-1", name: "Budi" },
                    role: "   ",
                }),
            ).toThrow(InvalidTokenPayloadError);

            expect(() =>
                provider.signAccessToken({
                    ...validPayload,
                    jti: "   ",
                }),
            ).toThrow(InvalidTokenPayloadError);
        });

        it("throws TokenExpiredError when the access token has expired", () => {
            const provider = new JwtTokenProvider({ ...dummyConfig, EXPIRES_IN: "-1s" });
            const expiredToken = provider.signAccessToken(validPayload);

            let caught: unknown;
            try {
                provider.verifyAccessToken(expiredToken);
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeInstanceOf(TokenExpiredError);
            expect(caught).toBeInstanceOf(InvalidTokenError);
            expect(caught).toBeInstanceOf(AppError);
            const err = caught as TokenExpiredError;
            expect(err.code).toBe("TOKEN_EXPIRED");
            expect(err.statusCode).toBe(401);
        });

        it("throws InvalidTokenError for empty, malformed, or wrong-issuer/audience tokens", () => {
            const provider = new JwtTokenProvider(dummyConfig);

            expect(() => provider.verifyAccessToken("")).toThrow(InvalidTokenError);
            expect(() => provider.verifyAccessToken("not-a-jwt")).toThrow(InvalidTokenError);

            const wrongIssuerProvider = new JwtTokenProvider({
                ...dummyConfig,
                ISSUER: "other-issuer",
            });
            const wrongIssuerToken = wrongIssuerProvider.signAccessToken(validPayload);
            expect(() => provider.verifyAccessToken(wrongIssuerToken)).toThrow(InvalidTokenError);

            const wrongAudienceProvider = new JwtTokenProvider({
                ...dummyConfig,
                AUDIENCE: "other-audience",
            });
            const wrongAudienceToken = wrongAudienceProvider.signAccessToken(validPayload);
            expect(() => provider.verifyAccessToken(wrongAudienceToken)).toThrow(InvalidTokenError);
        });

        it("throws InvalidTokenError when token payload shape is missing required fields", () => {
            const provider = new JwtTokenProvider(dummyConfig);
            const malformedPayloadToken = jwt.sign(
                { sub: { userId: "user-123" }, role: "USER" },
                dummyConfig.SECRET,
                {
                    algorithm: "HS256",
                    issuer: dummyConfig.ISSUER,
                    audience: dummyConfig.AUDIENCE,
                    jwtid: "jti-123",
                },
            );

            expect(() => provider.verifyAccessToken(malformedPayloadToken)).toThrow(
                InvalidTokenError,
            );
        });

        it("wraps unexpected jwt.sign failures in TokenProviderFailureError", () => {
            const rootCause = new Error("crypto failure");
            vi.spyOn(jwt, "sign").mockImplementationOnce(() => {
                throw rootCause;
            });

            const provider = new JwtTokenProvider(dummyConfig);

            let caught: unknown;
            try {
                provider.signAccessToken(validPayload);
            } catch (err) {
                caught = err;
            }

            expect(caught).toBeInstanceOf(TokenProviderFailureError);
            const err = caught as TokenProviderFailureError;
            expect(err.code).toBe("TOKEN_PROVIDER_FAILURE");
            expect(err.statusCode).toBe(500);
            expect(err.operation).toBe("signAccessToken");
            expect(err.cause).toBe(rootCause);
        });
    });

    describe("signRefreshToken, verifyRefreshToken & signTokenPair", () => {
        it("signs and verifies a valid refresh token", () => {
            const provider = new JwtTokenProvider(dummyConfig);
            const refreshToken = provider.signRefreshToken(validPayload);

            const decoded = provider.verifyRefreshToken(refreshToken);
            expect(decoded.sub).toEqual(validPayload.sub);
            expect(decoded.role).toBe(validPayload.role);
            expect(decoded.exp).toBe(decoded.iat + 7 * 24 * 3600);
        });

        it("rejects a refresh token when verified as an access token", () => {
            const provider = new JwtTokenProvider(dummyConfig);
            const refreshToken = provider.signRefreshToken(validPayload);

            expect(() => provider.verifyAccessToken(refreshToken)).toThrow(InvalidTokenError);
        });

        it("signs both access and refresh tokens with distinct auto-generated jtis in signTokenPair", () => {
            const provider = new JwtTokenProvider(dummyConfig);
            const { accessToken, refreshToken } = provider.signTokenPair(validPayload);

            expect(accessToken).not.toBe(refreshToken);
            const verifiedAccess = provider.verifyAccessToken(accessToken);
            const verifiedRefresh = provider.verifyRefreshToken(refreshToken);

            expect(verifiedAccess.sub).toEqual(validPayload.sub);
            expect(verifiedRefresh.sub).toEqual(validPayload.sub);
            expect(verifiedAccess.jti).not.toBe(verifiedRefresh.jti);
        });
    });
});

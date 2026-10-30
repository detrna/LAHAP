import jwt, { type Algorithm } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import type { JwtConfig } from "../../../../src/config/jwt.js";
import { JwtTokenProvider } from "../../../../src/infrastructure/token-provider/jwt/jwt.js";
import type { SignTokenPayload, TokenPair } from "../../../../src/shared/ports/token-provider/token-provider.js";

export const DEFAULT_TEST_JWT_CONFIG: JwtConfig = {
    SECRET: "test-access-secret-32-bytes-long!",
    EXPIRES_IN: "1h",
    REFRESH_SECRET: "test-refresh-secret-32-bytes-long!",
    REFRESH_EXPIRES_IN: "7d",
    ALGORITHM: "HS256",
    ISSUER: "gtnic-auth",
    AUDIENCE: "gtnic-app",
};

export const DEFAULT_TEST_PAYLOAD: SignTokenPayload = {
    sub: {
        userId: "test-user-id-1",
        name: "Test User",
    },
    role: "USER",
};

/**
 * Creates a test JwtConfig with sensible defaults, allowing overrides.
 */
export function createJwtConfig(overrides: Partial<JwtConfig> = {}): JwtConfig {
    return {
        ...DEFAULT_TEST_JWT_CONFIG,
        ...overrides,
    };
}

/**
 * Creates a SignTokenPayload with sensible defaults, merging sub-properties.
 */
export function createTokenPayload(overrides: Partial<SignTokenPayload> = {}): SignTokenPayload {
    return {
        sub: {
            userId: overrides.sub?.userId ?? DEFAULT_TEST_PAYLOAD.sub.userId,
            name: overrides.sub?.name ?? DEFAULT_TEST_PAYLOAD.sub.name,
        },
        role: overrides.role ?? DEFAULT_TEST_PAYLOAD.role,
        ...(overrides.jti !== undefined ? { jti: overrides.jti } : {}),
    };
}

/**
 * Creates a JwtTokenProvider instance using test configurations.
 */
export function createTokenProvider(configOverrides: Partial<JwtConfig> = {}): JwtTokenProvider {
    return new JwtTokenProvider(createJwtConfig(configOverrides));
}

/**
 * Creates a valid, signed access token string.
 */
export function createAccessToken(
    payloadOverrides: Partial<SignTokenPayload> = {},
    configOverrides: Partial<JwtConfig> = {},
): string {
    const provider = createTokenProvider(configOverrides);
    return provider.signAccessToken(createTokenPayload(payloadOverrides));
}

/**
 * Creates a valid, signed refresh token string.
 */
export function createRefreshToken(
    payloadOverrides: Partial<SignTokenPayload> = {},
    configOverrides: Partial<JwtConfig> = {},
): string {
    const provider = createTokenProvider(configOverrides);
    return provider.signRefreshToken(createTokenPayload(payloadOverrides));
}

/**
 * Creates a signed token pair (access and refresh token).
 */
export function createTokenPair(
    payloadOverrides: Partial<SignTokenPayload> = {},
    configOverrides: Partial<JwtConfig> = {},
): TokenPair {
    const provider = createTokenProvider(configOverrides);
    return provider.signTokenPair(createTokenPayload(payloadOverrides));
}

/**
 * Creates an expired access token for testing token expiration errors.
 */
export function createExpiredAccessToken(
    payloadOverrides: Partial<SignTokenPayload> = {},
    configOverrides: Partial<JwtConfig> = {},
    expiredSecondsAgo = 10,
): string {
    const config = createJwtConfig(configOverrides);
    const payload = createTokenPayload(payloadOverrides);

    return jwt.sign(
        {
            sub: payload.sub,
            role: payload.role,
            jti: payload.jti ?? randomUUID(),
        },
        config.SECRET,
        {
            algorithm: config.ALGORITHM as Algorithm,
            expiresIn: -Math.abs(expiredSecondsAgo),
            issuer: config.ISSUER,
            audience: config.AUDIENCE,
        },
    );
}

/**
 * Creates an expired refresh token for testing expiration errors.
 */
export function createExpiredRefreshToken(
    payloadOverrides: Partial<SignTokenPayload> = {},
    configOverrides: Partial<JwtConfig> = {},
    expiredSecondsAgo = 10,
): string {
    const config = createJwtConfig(configOverrides);
    const payload = createTokenPayload(payloadOverrides);

    return jwt.sign(
        {
            sub: payload.sub,
            role: payload.role,
            jti: payload.jti ?? randomUUID(),
        },
        config.REFRESH_SECRET,
        {
            algorithm: config.ALGORITHM as Algorithm,
            expiresIn: -Math.abs(expiredSecondsAgo),
            issuer: config.ISSUER,
            audience: config.AUDIENCE,
        },
    );
}

/**
 * Wraps a token string into a Bearer header string.
 */
export function createBearerHeader(token: string): string {
    return `Bearer ${token}`;
}

/**
 * Generates an Authorization header object with a valid access token.
 */
export function createAuthHeaders(
    payloadOverrides: Partial<SignTokenPayload> = {},
    configOverrides: Partial<JwtConfig> = {},
): { authorization: string } {
    return {
        authorization: createBearerHeader(createAccessToken(payloadOverrides, configOverrides)),
    };
}

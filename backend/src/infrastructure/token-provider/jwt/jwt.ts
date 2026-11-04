import { randomUUID } from "node:crypto";
import jwt, { type Algorithm, type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import type { JwtConfig } from "../../../config/jwt.js";
import { isRole, ROLES, type Role } from "../../../shared/auth/roles.js";
import {
    InvalidTokenError,
    InvalidTokenPayloadError,
    TokenExpiredError,
    TokenProviderFailureError,
} from "../../../shared/ports/token-provider/errors.js";
import type {
    SignTokenPayload,
    TokenPair,
    TokenProvider,
    VerifiedTokenPayload,
} from "../../../shared/ports/token-provider/token-provider.js";

const SUPPORTED_ALGORITHMS = new Set<Algorithm>(["HS256", "HS384", "HS512"]);

type TokenType = "access" | "refresh";

const decodedPayloadSchema = z.object({
    sub: z.object({
        userId: z.string().trim().min(1),
        name: z.string().trim().min(1),
    }),
    role: z.enum(ROLES),
    typ: z.enum(["access", "refresh"]),
    jti: z.string().trim().min(1),
    iat: z.number().int(),
    exp: z.number().int(),
    iss: z.string().trim().min(1),
    aud: z.string().trim().min(1),
});

function normalizePayload(payload: SignTokenPayload): {
    sub: { userId: string; name: string };
    role: Role;
    jwtid: string;
} {
    const userId = payload.sub?.userId?.trim();
    if (!userId) {
        throw new InvalidTokenPayloadError("token payload sub.userId must not be empty");
    }

    const name = payload.sub?.name?.trim();
    if (!name) {
        throw new InvalidTokenPayloadError("token payload sub.name must not be empty");
    }

    const role = payload.role;
    if (!isRole(role)) {
        throw new InvalidTokenPayloadError(`token payload role must be one of ${ROLES.join(", ")}`);
    }

    let jwtid: string;
    if (payload.jti !== undefined) {
        const trimmedJti = payload.jti.trim();
        if (!trimmedJti) {
            throw new InvalidTokenPayloadError("token payload jti must not be empty");
        }
        jwtid = trimmedJti;
    } else {
        jwtid = randomUUID();
    }

    return {
        sub: { userId, name },
        role,
        jwtid,
    };
}

function readSignedClaims(token: string): { jti: string; lifetimeInSeconds: number } {
    const { jti, iat, exp } = jwt.decode(token) as { jti: string; iat: number; exp: number };
    return { jti, lifetimeInSeconds: exp - iat };
}

export class JwtTokenProvider implements TokenProvider {
    private readonly secret: string;
    private readonly expiresIn: string;
    private readonly refreshSecret: string;
    private readonly refreshExpiresIn: string;
    private readonly algorithm: Algorithm;
    private readonly issuer: string;
    private readonly audience: string;

    constructor(config: JwtConfig) {
        if (!config.SECRET.trim()) {
            throw new Error("JWT_SECRET is not set");
        }
        if (!config.EXPIRES_IN.trim()) {
            throw new Error("JWT_EXPIRES_IN is not set");
        }
        if (!config.REFRESH_SECRET.trim()) {
            throw new Error("JWT_REFRESH_SECRET is not set");
        }
        if (!config.REFRESH_EXPIRES_IN.trim()) {
            throw new Error("JWT_REFRESH_EXPIRES_IN is not set");
        }
        if (!config.ISSUER.trim()) {
            throw new Error("JWT_ISSUER is not set");
        }
        if (!config.AUDIENCE.trim()) {
            throw new Error("JWT_AUDIENCE is not set");
        }
        if (config.SECRET === config.REFRESH_SECRET) {
            throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be different");
        }
        if (!SUPPORTED_ALGORITHMS.has(config.ALGORITHM as Algorithm)) {
            throw new Error(`Unsupported JWT_ALGORITHM: ${config.ALGORITHM}`);
        }

        this.secret = config.SECRET;
        this.expiresIn = config.EXPIRES_IN;
        this.refreshSecret = config.REFRESH_SECRET;
        this.refreshExpiresIn = config.REFRESH_EXPIRES_IN;
        this.algorithm = config.ALGORITHM as Algorithm;
        this.issuer = config.ISSUER;
        this.audience = config.AUDIENCE;
    }

    private signToken(
        payload: SignTokenPayload,
        typ: TokenType,
        secret: string,
        expiresIn: string,
        operation: "signAccessToken" | "signRefreshToken",
    ): string {
        const { sub, role, jwtid } = normalizePayload(payload);

        try {
            return jwt.sign({ sub, role, typ }, secret, {
                algorithm: this.algorithm,
                expiresIn: expiresIn as NonNullable<SignOptions["expiresIn"]>,
                issuer: this.issuer,
                audience: this.audience,
                jwtid,
            });
        } catch (cause) {
            throw new TokenProviderFailureError(operation, cause);
        }
    }

    private verifyToken(token: string, secret: string, typ: TokenType): VerifiedTokenPayload {
        const trimmed = token.trim();
        if (!trimmed) {
            throw new InvalidTokenError("token must not be empty");
        }

        let decoded: unknown;
        try {
            decoded = jwt.verify(trimmed, secret, {
                algorithms: [this.algorithm],
                issuer: this.issuer,
                audience: this.audience,
            });
        } catch (cause) {
            if (cause instanceof jwt.TokenExpiredError) {
                throw new TokenExpiredError("token has expired", { cause });
            }
            throw new InvalidTokenError("invalid token", { cause });
        }

        const parsed = decodedPayloadSchema.safeParse(decoded);
        if (!parsed.success) {
            throw new InvalidTokenError("malformed token payload", { cause: parsed.error });
        }
        if (parsed.data.typ !== typ) {
            throw new InvalidTokenError(`expected a ${typ} token`);
        }

        return {
            sub: {
                userId: parsed.data.sub.userId,
                name: parsed.data.sub.name,
            },
            role: parsed.data.role,
            jti: parsed.data.jti,
            iat: parsed.data.iat,
            exp: parsed.data.exp,
            iss: parsed.data.iss,
            aud: parsed.data.aud,
        };
    }

    signAccessToken(payload: SignTokenPayload): string {
        return this.signToken(payload, "access", this.secret, this.expiresIn, "signAccessToken");
    }

    verifyAccessToken(token: string): VerifiedTokenPayload {
        return this.verifyToken(token, this.secret, "access");
    }

    signRefreshToken(payload: SignTokenPayload): string {
        return this.signToken(payload, "refresh", this.refreshSecret, this.refreshExpiresIn, "signRefreshToken");
    }

    verifyRefreshToken(token: string): VerifiedTokenPayload {
        return this.verifyToken(token, this.refreshSecret, "refresh");
    }

    signTokenPair(payload: SignTokenPayload): TokenPair {
        const accessToken = this.signAccessToken(payload);
        const refreshToken = this.signRefreshToken(payload);
        const refreshClaims = readSignedClaims(refreshToken);
        return {
            accessToken,
            refreshToken,
            refreshTokenId: refreshClaims.jti,
            expiresIn: readSignedClaims(accessToken).lifetimeInSeconds,
            refreshExpiresIn: refreshClaims.lifetimeInSeconds,
        };
    }
}

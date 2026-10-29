import { randomUUID } from "node:crypto";
import jwt, { type Algorithm, type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import type { JwtConfig } from "../../../config/jwt.js";
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

const decodedPayloadSchema = z.object({
    sub: z.object({
        userId: z.string().trim().min(1),
        name: z.string().trim().min(1),
    }),
    role: z.string().trim().min(1),
    jti: z.string().trim().min(1),
    iat: z.number().int(),
    exp: z.number().int(),
    iss: z.string().trim().min(1),
    aud: z.string().trim().min(1),
});

function normalizePayload(payload: SignTokenPayload): {
    sub: { userId: string; name: string };
    role: string;
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

    const role = payload.role?.trim();
    if (!role) {
        throw new InvalidTokenPayloadError("token payload role must not be empty");
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
        secret: string,
        expiresIn: string,
        operation: "signAccessToken" | "signRefreshToken",
    ): string {
        const { sub, role, jwtid } = normalizePayload(payload);

        try {
            return jwt.sign({ sub, role }, secret, {
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

    private verifyToken(token: string, secret: string): VerifiedTokenPayload {
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
        return this.signToken(payload, this.secret, this.expiresIn, "signAccessToken");
    }

    verifyAccessToken(token: string): VerifiedTokenPayload {
        return this.verifyToken(token, this.secret);
    }

    signRefreshToken(payload: SignTokenPayload): string {
        return this.signToken(
            payload,
            this.refreshSecret,
            this.refreshExpiresIn,
            "signRefreshToken",
        );
    }

    verifyRefreshToken(token: string): VerifiedTokenPayload {
        return this.verifyToken(token, this.refreshSecret);
    }

    signTokenPair(payload: SignTokenPayload): TokenPair {
        return {
            accessToken: this.signAccessToken(payload),
            refreshToken: this.signRefreshToken(payload),
        };
    }
}

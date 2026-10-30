import type { NextFunction, Request, RequestHandler, Response } from "express";
import type {
    TokenProvider,
    VerifiedTokenPayload,
} from "../../shared/ports/token-provider/token-provider.js";
import {
    InvalidAuthorizationHeaderError,
    MissingTokenError,
} from "./errors.js";

export interface AuthenticatedUser {
    readonly userId: string;
    readonly name: string;
    readonly role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthenticatedUser;
            tokenPayload?: VerifiedTokenPayload;
        }
    }
}

export interface AuthenticatedRequest extends Request {
    user: AuthenticatedUser;
    tokenPayload: VerifiedTokenPayload;
}

export interface AuthenticateOptions {
    readonly tokenProvider: TokenProvider;
}

export function extractBearerToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader !== undefined) {
        const trimmed = authHeader.trim();
        if (!trimmed) {
            throw new InvalidAuthorizationHeaderError("authorization header must not be empty");
        }

        const match = /^Bearer\s+(\S+)$/i.exec(trimmed);
        if (!match || !match[1]) {
            throw new InvalidAuthorizationHeaderError(
                "authorization header must be in format 'Bearer <token>'",
            );
        }

        return match[1];
    }

    const customHeader = req.headers["x-access-token"];
    if (typeof customHeader === "string" && customHeader.trim()) {
        return customHeader.trim();
    }

    return null;
}

/**
 * Express middleware that authenticates requests using JWT access tokens.
 *
 * - Extracts the token from the standard `Authorization: Bearer <token>` header (or `x-access-token`).
 * - Verifies the access token using the provided `TokenProvider`.
 * - Populates `req.user = { userId, name, role }` and `req.tokenPayload`.
 * - On failure (missing, malformed, invalid, or expired token), forwards the error to `next(err)`.
 */
export function authenticate(options: AuthenticateOptions): RequestHandler {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const token = extractBearerToken(req);
            if (!token) {
                next(new MissingTokenError());
                return;
            }

            const payload = options.tokenProvider.verifyAccessToken(token);

            req.user = {
                userId: payload.sub.userId,
                name: payload.sub.name,
                role: payload.role,
            };
            req.tokenPayload = payload;

            next();
        } catch (error) {
            next(error);
        }
    };
}

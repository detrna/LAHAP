export * from "./errors.js";

export interface TokenSubject {
    readonly userId: string;
    readonly name: string;
}

export interface SignTokenPayload {
    readonly sub: TokenSubject;
    readonly role: string;
    readonly jti?: string | undefined;
}

export interface VerifiedTokenPayload {
    readonly sub: TokenSubject;
    readonly role: string;
    readonly jti: string;
    readonly iat: number;
    readonly exp: number;
    readonly iss: string;
    readonly aud: string;
}

export interface TokenPair {
    readonly accessToken: string;
    readonly refreshToken: string;
}

export interface TokenProvider {
    /** Signs a short-lived access token for the given payload. */
    signAccessToken(payload: SignTokenPayload): string;

    /** Verifies an access token and returns its decoded payload and registered claims. Throws InvalidTokenError or TokenExpiredError on failure. */
    verifyAccessToken(token: string): VerifiedTokenPayload;

    /** Signs a long-lived refresh token for the given payload. */
    signRefreshToken(payload: SignTokenPayload): string;

    /** Verifies a refresh token and returns its decoded payload and registered claims. Throws InvalidTokenError or TokenExpiredError on failure. */
    verifyRefreshToken(token: string): VerifiedTokenPayload;

    /** Signs both an access token and a refresh token for the given payload. */
    signTokenPair(payload: SignTokenPayload): TokenPair;
}

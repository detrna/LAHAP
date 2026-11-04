import type { CookieOptions, Request, Response } from "express";
import type { CookieSameSite } from "../../../config/http.js";
import type { AuthSession } from "../domain/auth.domain.js";
import type { RefreshBody } from "../schema/auth.schemas.js";

export const REFRESH_COOKIE_PATH = "/api/auth";

export interface RefreshCookieOptions {
    readonly name: string;
    readonly sameSite: CookieSameSite;
    readonly secure: boolean;
}

function toCookieAttributes(options: RefreshCookieOptions): CookieOptions {
    return { httpOnly: true, secure: options.secure, sameSite: options.sameSite, path: REFRESH_COOKIE_PATH };
}

export function setRefreshCookie(res: Response, options: RefreshCookieOptions, session: AuthSession): void {
    res.cookie(options.name, session.refreshToken, {
        ...toCookieAttributes(options),
        maxAge: session.refreshExpiresIn * 1000,
    });
}

export function clearRefreshCookie(res: Response, options: RefreshCookieOptions): void {
    res.clearCookie(options.name, toCookieAttributes(options));
}

export function readRefreshToken(req: Request, options: RefreshCookieOptions): string | undefined {
    const bodyToken = (req.body as RefreshBody | undefined)?.refreshToken;
    if (bodyToken !== undefined) return bodyToken;
    const cookieToken: unknown = req.cookies?.[options.name];
    return typeof cookieToken === "string" && cookieToken !== "" ? cookieToken : undefined;
}

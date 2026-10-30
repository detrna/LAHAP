import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ForbiddenError, MissingTokenError } from "./errors.js";

/**
 * Express middleware that guards endpoints based on user roles.
 *
 * Requirements:
 * - Must be placed after `authenticate()` so `req.user` is populated.
 * - If `req.user` is not set, forwards a `MissingTokenError` (401).
 * - If `roles` are specified and `req.user.role` is not in the allowed list,
 *   forwards a `ForbiddenError` (403).
 * - Otherwise, calls `next()`.
 *
 * Supports both rest arguments `authorize("ADMIN", "MANAGER")`
 * and array arguments `authorize(["ADMIN", "MANAGER"])`.
 */
export function authorize(...roles: (string | readonly string[])[]): RequestHandler {
    const allowedRoles = roles.flat();

    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new MissingTokenError("authentication required before authorization check"));
            return;
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            next(
                new ForbiddenError(
                    `role "${req.user.role}" is not authorized to access this resource`,
                ),
            );
            return;
        }

        next();
    };
}

export const requireRoles = authorize;


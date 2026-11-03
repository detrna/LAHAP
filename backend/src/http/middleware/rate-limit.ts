import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Cache } from "../../shared/ports/cache/cache.js";
import type { Logger } from "../../shared/ports/logger/logger.js";
import { TooManyRequestsError } from "./errors.js";

export interface RateLimitOptions {
    readonly cache: Cache;
    readonly logger?: Logger | undefined;
    readonly name: string;
    readonly limit: number;
    readonly windowSeconds: number;
    readonly key?: ((req: Request) => string) | undefined;
}

const assertPositiveInteger = (name: string, value: number): void => {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`rateLimit ${name} must be a positive integer, got ${value}`);
    }
};

export function rateLimit(options: RateLimitOptions): RequestHandler {
    const { cache, logger, name, limit, windowSeconds } = options;
    assertPositiveInteger("limit", limit);
    assertPositiveInteger("windowSeconds", windowSeconds);
    const pickSubject = options.key ?? ((req: Request) => req.ip ?? req.socket?.remoteAddress ?? "unknown");

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        let counter;
        try {
            counter = await cache.increment(`ratelimit:${name}:${pickSubject(req)}`, { ttlSeconds: windowSeconds });
        } catch (err) {
            logger?.warn({ err, rateLimit: name }, "rate limit check failed; allowing the request");
            next();
            return;
        }

        if (counter.value > limit) {
            const retryAfterSeconds = Math.max(1, counter.expiresInSeconds);
            res.setHeader("Retry-After", String(retryAfterSeconds));
            next(new TooManyRequestsError(retryAfterSeconds));
            return;
        }

        next();
    };
}

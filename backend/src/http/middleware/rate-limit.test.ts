import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import { createMockNext, createMockRequest, createMockResponse } from "../../../tests/utils/mocks/express.js";
import { createMockLogger } from "../../../tests/utils/mocks/logger.js";
import { CacheFailureError } from "../../shared/ports/cache/errors.js";
import type { Cache, CacheCounter } from "../../shared/ports/cache/cache.js";
import { TooManyRequestsError } from "./errors.js";
import { rateLimit } from "./rate-limit.js";

function createCounterCache(counter: CacheCounter | Error) {
    const increment = vi.fn<Cache["increment"]>(async () => {
        if (counter instanceof Error) throw counter;
        return counter;
    });
    return { cache: { increment } as unknown as Cache, increment };
}

function requestFrom(ip: string): Request {
    const req = createMockRequest({ method: "POST", path: "/auth/login" });
    Object.defineProperty(req, "ip", { value: ip });
    return req;
}

describe("rateLimit middleware (unit)", () => {
    it("allows a request within the limit and counts it per IP", async () => {
        const { cache, increment } = createCounterCache({ value: 10, expiresInSeconds: 42 });
        const res = createMockResponse();
        const next = createMockNext();

        await rateLimit({ cache, name: "login", limit: 10, windowSeconds: 60 })(requestFrom("1.2.3.4"), res, next);

        expect(increment).toHaveBeenCalledWith("ratelimit:login:1.2.3.4", { ttlSeconds: 60 });
        expect(next).toHaveBeenCalledWith();
        expect(res.setHeader).not.toHaveBeenCalled();
    });

    it("rejects the request after the limit with Retry-After and a 429 error", async () => {
        const { cache } = createCounterCache({ value: 11, expiresInSeconds: 42 });
        const res = createMockResponse();
        const next = createMockNext();

        await rateLimit({ cache, name: "login", limit: 10, windowSeconds: 60 })(requestFrom("1.2.3.4"), res, next);

        expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "42");
        const err = next.mock.calls[0]?.[0];
        expect(err).toBeInstanceOf(TooManyRequestsError);
        expect(err).toMatchObject({ statusCode: 429, code: "TOO_MANY_REQUESTS", retryAfterSeconds: 42 });
    });

    it("never sends Retry-After: 0", async () => {
        const { cache } = createCounterCache({ value: 3, expiresInSeconds: 0 });
        const res = createMockResponse();

        await rateLimit({ cache, name: "register", limit: 2, windowSeconds: 60 })(
            requestFrom("1.2.3.4"),
            res,
            createMockNext(),
        );

        expect(res.setHeader).toHaveBeenCalledWith("Retry-After", "1");
    });

    it("uses a custom key when given", async () => {
        const { cache, increment } = createCounterCache({ value: 1, expiresInSeconds: 60 });
        const req = createMockRequest({ body: { identifier: "6281234567890" } });

        await rateLimit({
            cache,
            name: "login-account",
            limit: 5,
            windowSeconds: 900,
            key: r => String(r.body.identifier),
        })(req, createMockResponse(), createMockNext());

        expect(increment).toHaveBeenCalledWith("ratelimit:login-account:6281234567890", { ttlSeconds: 900 });
    });

    it("allows the request and warns when the cache fails", async () => {
        const failure = new CacheFailureError("increment", new Error("ECONNREFUSED"));
        const { cache } = createCounterCache(failure);
        const logger = createMockLogger();
        const next = createMockNext();

        await rateLimit({ cache, logger, name: "login", limit: 10, windowSeconds: 60 })(
            requestFrom("1.2.3.4"),
            createMockResponse(),
            next,
        );

        expect(next).toHaveBeenCalledWith();
        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ err: failure, rateLimit: "login" }),
            "rate limit check failed; allowing the request",
        );
    });

    it.each([
        { limit: 0, windowSeconds: 60 },
        { limit: 10, windowSeconds: 0 },
        { limit: 1.5, windowSeconds: 60 },
    ])("throws at setup for invalid options %o", ({ limit, windowSeconds }) => {
        const { cache } = createCounterCache({ value: 1, expiresInSeconds: 1 });
        expect(() => rateLimit({ cache, name: "login", limit, windowSeconds })).toThrow("must be a positive integer");
    });
});

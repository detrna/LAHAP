import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { CacheFailureError } from "../../shared/ports/cache/errors.js";
import type { Logger } from "../../shared/ports/logger/logger.js";
import { ObjectNotFoundError } from "../../shared/ports/object-storage/errors.js";
import { PaymentGatewayProviderError } from "../../shared/ports/payment-gateway/errors.js";
import { errorHandler } from "./error-handler.js";
import {
    ForbiddenError,
    MissingTokenError,
    RequestValidationError,
    type ValidationIssue,
} from "./errors.js";

function createMockRequest(
    overrides: {
        method?: string;
        path?: string;
        originalUrl?: string;
    } = {},
): Request {
    return {
        method: overrides.method ?? "POST",
        path: overrides.path ?? "/api/orders",
        originalUrl: overrides.originalUrl ?? overrides.path ?? "/api/orders",
    } as unknown as Request;
}

function createMockResponse(options: { headersSent?: boolean } = {}) {
    const res = {
        headersSent: options.headersSent ?? false,
        status: vi.fn(),
        json: vi.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);

    return res as unknown as Response & {
        status: ReturnType<typeof vi.fn>;
        json: ReturnType<typeof vi.fn>;
    };
}

function createMockNext() {
    const fn = vi.fn<(err?: unknown) => void>();
    return Object.assign(fn, {} as NextFunction);
}

function createMockLogger(): Logger & {
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
} {
    const logger = {
        fatal: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        child: vi.fn(),
        isLevelEnabled: vi.fn(() => true),
    };
    logger.child.mockReturnValue(logger);
    return logger;
}

describe("errorHandler middleware", () => {
    it("delegates to next(err) when headers have already been sent", () => {
        const logger = createMockLogger();
        const middleware = errorHandler({ logger });
        const err = new Error("stream interrupted");
        const req = createMockRequest();
        const res = createMockResponse({ headersSent: true });
        const next = createMockNext();

        middleware(err, req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith(err);
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("formats RequestValidationError (400) with validation issues and logs at warn", () => {
        const logger = createMockLogger();
        const middleware = errorHandler({ logger });
        const issues: ValidationIssue[] = [
            {
                target: "body",
                path: "email",
                message: "Invalid email address",
                code: "invalid_string",
            },
            {
                target: "query",
                path: "limit",
                message: "Must be positive",
                code: "too_small",
            },
        ];
        const validationErr = new RequestValidationError(issues);
        const req = createMockRequest({ method: "POST", originalUrl: "/api/users?limit=-1" });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(validationErr, req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                code: "VALIDATION_ERROR",
                message: validationErr.message,
                issues,
            },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({
                err: validationErr,
                method: "POST",
                path: "/api/users?limit=-1",
                statusCode: 400,
                code: "VALIDATION_ERROR",
                issues,
            }),
            validationErr.message,
        );
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("formats 4xx AppError subclasses with their statusCode and code and logs at warn", () => {
        const logger = createMockLogger();
        const middleware = errorHandler({ logger });

        const cases = [
            { err: new MissingTokenError(), expectedStatus: 401, expectedCode: "MISSING_TOKEN" },
            { err: new ForbiddenError("admin only"), expectedStatus: 403, expectedCode: "FORBIDDEN" },
            { err: new ObjectNotFoundError("receipts/1.jpg"), expectedStatus: 404, expectedCode: "OBJECT_NOT_FOUND" },
        ];

        for (const { err, expectedStatus, expectedCode } of cases) {
            const req = createMockRequest({ method: "GET", originalUrl: "/api/resource" });
            const res = createMockResponse();
            const next = createMockNext();

            middleware(err, req, res, next);

            expect(res.status).toHaveBeenCalledWith(expectedStatus);
            expect(res.json).toHaveBeenCalledWith({
                error: {
                    code: expectedCode,
                    message: err.message,
                },
            });
        }

        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("formats 5xx AppError subclasses with their statusCode and code and logs at error", () => {
        const logger = createMockLogger();
        const middleware = errorHandler({ logger });

        const cacheErr = new CacheFailureError("get", new Error("redis connection reset"));
        const gatewayErr = new PaymentGatewayProviderError("Midtrans upstream 502", { statusCode: 502 });

        const res1 = createMockResponse();
        middleware(cacheErr, createMockRequest(), res1, createMockNext());

        expect(res1.status).toHaveBeenCalledWith(500);
        expect(res1.json).toHaveBeenCalledWith({
            error: {
                code: "CACHE_FAILURE",
                message: cacheErr.message,
            },
        });

        const res2 = createMockResponse();
        middleware(gatewayErr, createMockRequest(), res2, createMockNext());

        expect(res2.status).toHaveBeenCalledWith(502);
        expect(res2.json).toHaveBeenCalledWith({
            error: {
                code: "PAYMENT_GATEWAY_PROVIDER_ERROR",
                message: gatewayErr.message,
            },
        });

        expect(logger.error).toHaveBeenCalledTimes(2);
        expect(logger.warn).not.toHaveBeenCalled();
    });

    it("handles malformed JSON SyntaxError from express.json() as 400 INVALID_JSON", () => {
        const logger = createMockLogger();
        const middleware = errorHandler({ logger });

        const syntaxErr = Object.assign(new SyntaxError("Unexpected token } in JSON at position 12"), {
            status: 400,
            statusCode: 400,
            type: "entity.parse.failed",
            body: "{ bad json }",
        });

        const req = createMockRequest({ method: "POST", originalUrl: "/api/payments" });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(syntaxErr, req, res, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                code: "INVALID_JSON",
                message: "malformed JSON in request body",
            },
        });
        expect(logger.warn).toHaveBeenCalledTimes(1);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it("masks unexpected Error and non-Error values as 500 INTERNAL_SERVER_ERROR and logs at error", () => {
        const logger = createMockLogger();
        const middleware = errorHandler({ logger });

        const unexpectedErr = new Error("SELECT * FROM users failed: password authentication failed");
        const req = createMockRequest({ method: "DELETE", originalUrl: "/api/users/1" });
        const res1 = createMockResponse();

        middleware(unexpectedErr, req, res1, createMockNext());

        expect(res1.status).toHaveBeenCalledWith(500);
        expect(res1.json).toHaveBeenCalledWith({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "internal server error",
            },
        });
        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({
                err: unexpectedErr,
                method: "DELETE",
                path: "/api/users/1",
                statusCode: 500,
                code: "INTERNAL_SERVER_ERROR",
            }),
            unexpectedErr.message,
        );

        const res2 = createMockResponse();
        middleware("string rejection", req, res2, createMockNext());

        expect(res2.status).toHaveBeenCalledWith(500);
        expect(res2.json).toHaveBeenCalledWith({
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "internal server error",
            },
        });
        expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it("works without a logger provided", () => {
        const middleware = errorHandler();
        const req = createMockRequest();
        const res = createMockResponse();

        middleware(new MissingTokenError(), req, res, createMockNext());

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: {
                code: "MISSING_TOKEN",
                message: "authentication token is required",
            },
        });
    });
});

import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { AppError } from "../../shared/errors/app-error.js";
import {
    RequestValidationError,
    validateBody,
    validateParams,
    validateQuery,
    validateRequest,
} from "./validate-request.js";

function createMockRequest(overrides: Partial<Pick<Request, "body" | "query" | "params">> = {}): Request {
    const rawQuery = overrides.query ?? {};
    const proto = {
        get query() {
            return rawQuery;
        },
    };

    const req = Object.create(proto) as Request;
    req.body = overrides.body ?? {};
    req.params = (overrides.params ?? {}) as Request["params"];

    return req;
}

function createMockResponse(): Response {
    return {} as unknown as Response;
}

function createMockNext() {
    const fn = vi.fn<(err?: unknown) => void>();
    return Object.assign(fn, {} as NextFunction);
}

describe("validateRequest middleware", () => {
    it("validates and transforms body, query, and params then calls next()", async () => {
        const middleware = validateRequest({
            params: z.object({
                id: z.string().uuid(),
            }),
            query: z.object({
                page: z.coerce.number().int().positive().default(1),
                search: z.string().trim().optional(),
            }),
            body: z.object({
                email: z.string().trim().toLowerCase().email(),
                name: z.string().trim().min(2),
            }),
        });

        const req = createMockRequest({
            params: { id: "550e8400-e29b-41d4-a716-446655440000" },
            query: { page: "3", search: "  matcha  ", extraQuery: "ignored" },
            body: { email: "  USER@Example.COM ", name: "  Alice  ", extraBody: "stripped" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(req.params).toEqual({ id: "550e8400-e29b-41d4-a716-446655440000" });
        expect(req.query).toEqual({ page: 3, search: "matcha" });
        expect(req.body).toEqual({ email: "user@example.com", name: "Alice" });
    });

    it("passes RequestValidationError (400) to next() when body validation fails", async () => {
        const middleware = validateBody(
            z.object({
                email: z.string().email("Invalid email address"),
                age: z.number().int().min(18, "Must be at least 18"),
            }),
        );

        const req = createMockRequest({
            body: { email: "not-an-email", age: 15 },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0]?.[0];
        expect(err).toBeInstanceOf(RequestValidationError);
        expect(err).toBeInstanceOf(AppError);

        const validationError = err as RequestValidationError;
        expect(validationError.code).toBe("VALIDATION_ERROR");
        expect(validationError.statusCode).toBe(400);
        expect(validationError.issues).toEqual([
            expect.objectContaining({
                target: "body",
                path: "email",
                message: "Invalid email address",
            }),
            expect.objectContaining({
                target: "body",
                path: "age",
                message: "Must be at least 18",
            }),
        ]);
        expect(validationError.message).toContain("body.email: Invalid email address");
        expect(validationError.message).toContain("body.age: Must be at least 18");
    });

    it("aggregates validation issues across params, query, and body in a single pass", async () => {
        const middleware = validateRequest({
            params: z.object({ id: z.string().uuid("Invalid ID") }),
            query: z.object({ limit: z.coerce.number().min(1, "Limit must be >= 1") }),
            body: z.object({ title: z.string().min(1, "Title is required") }),
        });

        const req = createMockRequest({
            params: { id: "bad-id" },
            query: { limit: "0" },
            body: { title: "" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const validationError = next.mock.calls[0]?.[0] as RequestValidationError;
        expect(validationError).toBeInstanceOf(RequestValidationError);
        expect(validationError.issues).toHaveLength(3);
        expect(validationError.issues.map(i => `${i.target}.${i.path}`)).toEqual([
            "params.id",
            "query.limit",
            "body.title",
        ]);
    });

    it("formats nested object and array paths using dot notation", async () => {
        const middleware = validateBody(
            z.object({
                items: z.array(
                    z.object({
                        quantity: z.number().int().positive("Quantity must be positive"),
                    }),
                ),
            }),
        );

        const req = createMockRequest({
            body: { items: [{ quantity: 2 }, { quantity: -1 }] },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        const validationError = next.mock.calls[0]?.[0] as RequestValidationError;
        expect(validationError).toBeInstanceOf(RequestValidationError);
        expect(validationError.issues[0]).toMatchObject({
            target: "body",
            path: "items.1.quantity",
            message: "Quantity must be positive",
        });
    });

    it("supports validateQuery and validateParams helper functions and async Zod refinements", async () => {
        const queryMiddleware = validateQuery(
            z.object({
                slug: z.string().refine(async val => val !== "reserved", "Slug is reserved"),
            }),
        );
        const paramsMiddleware = validateParams(
            z.object({
                code: z.string().length(4),
            }),
        );

        const req1 = createMockRequest({ query: { slug: "reserved" } });
        const next1 = createMockNext();
        await queryMiddleware(req1, createMockResponse(), next1);
        expect(next1.mock.calls[0]?.[0]).toBeInstanceOf(RequestValidationError);

        const req2 = createMockRequest({ params: { code: "ABCD" } });
        const next2 = createMockNext();
        await paramsMiddleware(req2, createMockResponse(), next2);
        expect(next2).toHaveBeenCalledWith();
    });
});
import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import { createMockNext, createMockRequest, createMockResponse } from "../../../tests/utils/mocks/express.js";
import { AppError } from "../../shared/errors/app-error.js";
import { RequestValidationError } from "./errors.js";
import { paginate, pagination } from "./paginate.js";

describe("paginate middleware", () => {
    it("populates default pagination parameters when query is empty", async () => {
        const middleware = paginate();
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(req.pagination).toEqual({
            page: 1,
            limit: 20,
            offset: 0,
            skip: 0,
            take: 20,
        });
        expect(req.query).toMatchObject({
            page: 1,
            limit: 20,
        });
    });

    it("coerces string query values to numbers and computes offset, skip, and take", async () => {
        const middleware = paginate();
        const req = createMockRequest({
            query: { page: "3", limit: "15" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.pagination).toEqual({
            page: 3,
            limit: 15,
            offset: 30,
            skip: 30,
            take: 15,
        });
        expect(req.query).toMatchObject({
            page: 3,
            limit: 15,
        });
    });

    it("preserves other query parameters present on req.query", async () => {
        const middleware = paginate();
        const req = createMockRequest({
            query: { page: "2", search: "matcha", status: "active" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.query).toEqual({
            page: 2,
            limit: 20,
            search: "matcha",
            status: "active",
        });
        expect(req.pagination).toEqual({
            page: 2,
            limit: 20,
            offset: 20,
            skip: 20,
            take: 20,
        });
    });

    it("respects custom options for defaultPage, defaultLimit, and maxLimit", async () => {
        const middleware = paginate({
            defaultPage: 2,
            defaultLimit: 10,
            maxLimit: 50,
        });
        const req = createMockRequest();
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.pagination).toEqual({
            page: 2,
            limit: 10,
            offset: 10,
            skip: 10,
            take: 10,
        });
        expect(req.query).toMatchObject({
            page: 2,
            limit: 10,
        });
    });

    it("works when used directly as middleware without function invocation", async () => {
        const req = createMockRequest({
            query: { page: "4", limit: "25" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await paginate(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.pagination).toEqual({
            page: 4,
            limit: 25,
            offset: 75,
            skip: 75,
            take: 25,
        });
    });

    it("works via the pagination alias", async () => {
        const middleware = pagination();
        const req = createMockRequest({
            query: { page: "2", limit: "10" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(req.pagination).toEqual({
            page: 2,
            limit: 10,
            offset: 10,
            skip: 10,
            take: 10,
        });
    });

    it("forwards RequestValidationError (400) to next() when page is less than 1", async () => {
        const middleware = paginate();
        const req = createMockRequest({
            query: { page: "0" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0]?.[0];
        expect(err).toBeInstanceOf(RequestValidationError);
        expect(err).toBeInstanceOf(AppError);

        const validationErr = err as RequestValidationError;
        expect(validationErr.code).toBe("VALIDATION_ERROR");
        expect(validationErr.statusCode).toBe(400);
        expect(validationErr.issues).toEqual([
            expect.objectContaining({
                target: "query",
                path: "page",
                message: "page must be at least 1",
            }),
        ]);
        expect(req.pagination).toBeUndefined();
    });

    it("forwards RequestValidationError (400) to next() when limit exceeds maxLimit", async () => {
        const middleware = paginate({ maxLimit: 50 });
        const req = createMockRequest({
            query: { limit: "51" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0]?.[0] as RequestValidationError;
        expect(err).toBeInstanceOf(RequestValidationError);
        expect(err.issues).toEqual([
            expect.objectContaining({
                target: "query",
                path: "limit",
                message: "limit must not exceed 50",
            }),
        ]);
    });

    it("forwards RequestValidationError for non-integer query values", async () => {
        const middleware = paginate();
        const req = createMockRequest({
            query: { page: "not-a-number", limit: "3.14" },
        });
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        const err = next.mock.calls[0]?.[0] as RequestValidationError;
        expect(err).toBeInstanceOf(RequestValidationError);
        expect(err.issues).toHaveLength(2);
        expect(err.issues.map(i => `${i.target}.${i.path}`)).toEqual(["query.page", "query.limit"]);
    });

    it("forwards unexpected errors to next()", async () => {
        const req = {
            get query() {
                throw new Error("unexpected property access error");
            },
        } as unknown as Request;
        const res = createMockResponse();
        const next = createMockNext();

        await paginate()(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });
});


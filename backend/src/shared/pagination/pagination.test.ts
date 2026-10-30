import { describe, expect, it } from "vitest";
import {
    createPaginationMeta,
    createPaginationQuerySchema,
    DEFAULT_LIMIT,
    DEFAULT_PAGE,
    MAX_LIMIT,
    paginationQuerySchema,
    toPaginationParams,
} from "./pagination.js";

describe("pagination", () => {
    describe("paginationQuerySchema", () => {
        it("applies default page and limit when omitted", () => {
            const parsed = paginationQuerySchema.parse({});

            expect(parsed).toEqual({
                page: DEFAULT_PAGE,
                limit: DEFAULT_LIMIT,
            });
        });

        it("coerces string query values into numbers", () => {
            const parsed = paginationQuerySchema.parse({
                page: "3",
                limit: "50",
            });

            expect(parsed).toEqual({
                page: 3,
                limit: 50,
            });
        });

        it("rejects page < 1, limit < 1, non-integers, and limit > MAX_LIMIT", () => {
            expect(paginationQuerySchema.safeParse({ page: 0 }).success).toBe(false);
            expect(paginationQuerySchema.safeParse({ page: -1 }).success).toBe(false);
            expect(paginationQuerySchema.safeParse({ page: 1.5 }).success).toBe(false);
            expect(paginationQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
            expect(paginationQuerySchema.safeParse({ limit: MAX_LIMIT + 1 }).success).toBe(false);
        });
    });

    describe("createPaginationQuerySchema", () => {
        it("creates a schema with custom defaults and maxLimit", () => {
            const customSchema = createPaginationQuerySchema({
                defaultPage: 2,
                defaultLimit: 10,
                maxLimit: 30,
            });

            expect(customSchema.parse({})).toEqual({
                page: 2,
                limit: 10,
            });

            expect(customSchema.safeParse({ limit: 31 }).success).toBe(false);
            expect(customSchema.safeParse({ limit: 30 }).success).toBe(true);
        });
    });

    describe("toPaginationParams", () => {
        it("returns default pagination params when query is omitted", () => {
            expect(toPaginationParams()).toEqual({
                page: DEFAULT_PAGE,
                limit: DEFAULT_LIMIT,
                offset: 0,
                skip: 0,
                take: DEFAULT_LIMIT,
            });
        });

        it("calculates offset/skip and take for custom page and limit", () => {
            expect(toPaginationParams({ page: 3, limit: 15 })).toEqual({
                page: 3,
                limit: 15,
                offset: 30,
                skip: 30,
                take: 15,
            });
        });

        it("calculates offset/skip and take respecting custom PaginationOptions", () => {
            expect(
                toPaginationParams(
                    {},
                    { defaultPage: 2, defaultLimit: 5, maxLimit: 25 },
                ),
            ).toEqual({
                page: 2,
                limit: 5,
                offset: 5,
                skip: 5,
                take: 5,
            });
        });

        it("clamps invalid page and limit values into valid bounds", () => {
            expect(toPaginationParams({ page: 0, limit: 500 })).toEqual({
                page: 1,
                limit: MAX_LIMIT,
                offset: 0,
                skip: 0,
                take: MAX_LIMIT,
            });
        });
    });

    describe("createPaginationMeta", () => {
        it("returns zero totalPages and false navigation flags when total is 0", () => {
            expect(createPaginationMeta({ page: 1, limit: 20, total: 0 })).toEqual({
                page: 1,
                limit: 20,
                total: 0,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
            });
        });

        it("computes totalPages, hasNextPage, and hasPrevPage on the first page", () => {
            expect(createPaginationMeta({ page: 1, limit: 10, total: 25 })).toEqual({
                page: 1,
                limit: 10,
                total: 25,
                totalPages: 3,
                hasNextPage: true,
                hasPrevPage: false,
            });
        });

        it("computes navigation flags on a middle page", () => {
            expect(createPaginationMeta({ page: 2, limit: 10, total: 25 })).toEqual({
                page: 2,
                limit: 10,
                total: 25,
                totalPages: 3,
                hasNextPage: true,
                hasPrevPage: true,
            });
        });

        it("computes navigation flags on the last page", () => {
            expect(createPaginationMeta({ page: 3, limit: 10, total: 25 })).toEqual({
                page: 3,
                limit: 10,
                total: 25,
                totalPages: 3,
                hasNextPage: false,
                hasPrevPage: true,
            });
        });
    });
});


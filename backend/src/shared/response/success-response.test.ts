import { describe, expect, it } from "vitest";
import { createPaginationMeta } from "../pagination/index.js";
import {
    createPaginatedResponse,
    createSuccessResponse,
    type PaginatedResponseBody,
    type SuccessResponseBody,
} from "./success-response.js";

describe("success-response", () => {
    it("creates a SuccessResponseBody without meta when meta is omitted", () => {
        const response: SuccessResponseBody<{ id: string; name: string }> =
            createSuccessResponse({
                id: "user-1",
                name: "Budi",
            });

        expect(response).toEqual({
            data: {
                id: "user-1",
                name: "Budi",
            },
        });
        expect("meta" in response).toBe(false);
        expect(response.meta).toBeUndefined();
    });

    it("creates a SuccessResponseBody with meta when meta is provided", () => {
        const response = createSuccessResponse(
            [{ id: "item-1" }],
            { requestId: "req-123" },
        );

        expect(response).toEqual({
            data: [{ id: "item-1" }],
            meta: {
                requestId: "req-123",
            },
        });
    });

    it("creates a PaginatedResponseBody from PaginationMetaInput", () => {
        const items = [{ id: "1" }, { id: "2" }];
        const response: PaginatedResponseBody<{ id: string }> =
            createPaginatedResponse(items, {
                page: 1,
                limit: 2,
                total: 5,
            });

        expect(response).toEqual({
            data: items,
            meta: {
                page: 1,
                limit: 2,
                total: 5,
                totalPages: 3,
                hasNextPage: true,
                hasPrevPage: false,
            },
        });
    });

    it("creates a PaginatedResponseBody from an existing PaginationMeta object", () => {
        const items = [{ id: "3" }, { id: "4" }];
        const meta = createPaginationMeta({ page: 2, limit: 2, total: 4 });
        const response = createPaginatedResponse(items, meta);

        expect(response).toEqual({
            data: items,
            meta: {
                page: 2,
                limit: 2,
                total: 4,
                totalPages: 2,
                hasNextPage: false,
                hasPrevPage: true,
            },
        });
    });
});


import { z } from "zod";

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export const paginationQuerySchema = z.object({
    page: z.coerce
        .number()
        .int("page must be an integer")
        .min(1, "page must be at least 1")
        .default(DEFAULT_PAGE),
    limit: z.coerce
        .number()
        .int("limit must be an integer")
        .min(1, "limit must be at least 1")
        .max(MAX_LIMIT, `limit must not exceed ${MAX_LIMIT}`)
        .default(DEFAULT_LIMIT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationOptions {
    readonly defaultPage?: number | undefined;
    readonly defaultLimit?: number | undefined;
    readonly maxLimit?: number | undefined;
}

export function createPaginationQuerySchema(options: PaginationOptions = {}) {
    const defaultPage = options.defaultPage ?? DEFAULT_PAGE;
    const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
    const maxLimit = options.maxLimit ?? MAX_LIMIT;

    return z.object({
        page: z.coerce
            .number()
            .int("page must be an integer")
            .min(1, "page must be at least 1")
            .default(defaultPage),
        limit: z.coerce
            .number()
            .int("limit must be an integer")
            .min(1, "limit must be at least 1")
            .max(maxLimit, `limit must not exceed ${maxLimit}`)
            .default(defaultLimit),
    });
}

export interface PaginationParams {
    readonly page: number;
    readonly limit: number;
    readonly offset: number;
    readonly skip: number;
    readonly take: number;
}

export interface PaginationMetaInput {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
}

export interface PaginationMeta {
    readonly page: number;
    readonly limit: number;
    readonly total: number;
    readonly totalPages: number;
    readonly hasNextPage: boolean;
    readonly hasPrevPage: boolean;
}

export function toPaginationParams(
    query: Partial<PaginationQuery> = {},
    options: PaginationOptions = {},
): PaginationParams {
    const defaultPage = options.defaultPage ?? DEFAULT_PAGE;
    const defaultLimit = options.defaultLimit ?? DEFAULT_LIMIT;
    const maxLimit = options.maxLimit ?? MAX_LIMIT;

    const page = Math.max(1, Math.trunc(query.page ?? defaultPage));
    const limit = Math.min(maxLimit, Math.max(1, Math.trunc(query.limit ?? defaultLimit)));
    const offset = (page - 1) * limit;

    return {
        page,
        limit,
        offset,
        skip: offset,
        take: limit,
    };
}

export function createPaginationMeta(input: PaginationMetaInput): PaginationMeta {
    const page = Math.max(1, Math.trunc(input.page));
    const limit = Math.max(1, Math.trunc(input.limit));
    const total = Math.max(0, Math.trunc(input.total));
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1 && totalPages > 0,
    };
}


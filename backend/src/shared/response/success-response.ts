import {
    createPaginationMeta,
    type PaginationMeta,
    type PaginationMetaInput,
} from "../pagination/index.js";

export interface SuccessResponseBody<
    TData,
    TMeta = Record<string, unknown> | undefined,
> {
    readonly data: TData;
    readonly meta?: TMeta | undefined;
}

export type PaginatedResponseBody<TItem> = SuccessResponseBody<
    readonly TItem[],
    PaginationMeta
>;

export function createSuccessResponse<TData>(
    data: TData,
): SuccessResponseBody<TData, undefined>;
export function createSuccessResponse<TData, TMeta>(
    data: TData,
    meta: TMeta,
): SuccessResponseBody<TData, TMeta>;
export function createSuccessResponse<TData, TMeta = undefined>(
    data: TData,
    meta?: TMeta,
): SuccessResponseBody<TData, TMeta> {
    return {
        data,
        ...(meta !== undefined ? { meta } : {}),
    };
}

function isPaginationMeta(
    value: PaginationMetaInput | PaginationMeta,
): value is PaginationMeta {
    return (
        "totalPages" in value &&
        "hasNextPage" in value &&
        "hasPrevPage" in value
    );
}

export function createPaginatedResponse<TItem>(
    items: readonly TItem[],
    pagination: PaginationMetaInput | PaginationMeta,
): PaginatedResponseBody<TItem> {
    const meta = isPaginationMeta(pagination)
        ? pagination
        : createPaginationMeta(pagination);

    return createSuccessResponse(items, meta);
}


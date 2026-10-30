import type { NextFunction, Request, RequestHandler, Response } from "express";
import {
    createPaginationQuerySchema,
    toPaginationParams,
    type PaginationOptions,
    type PaginationParams,
} from "../../shared/pagination/index.js";
import { RequestValidationError } from "./errors.js";
import { assignParsedValue, toValidationIssues } from "./validate-request.js";

declare global {
    namespace Express {
        interface Request {
            pagination?: PaginationParams;
        }
    }
}

export interface PaginatedRequest extends Request {
    pagination: PaginationParams;
}

export type PaginateOptions = PaginationOptions;

function createPaginateMiddleware(options: PaginateOptions = {}): RequestHandler {
    const schema = createPaginationQuerySchema(options);

    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const rawQuery = typeof req.query === "object" && req.query !== null ? req.query : {};
            const result = await schema.safeParseAsync(rawQuery);

            if (!result.success) {
                next(new RequestValidationError(toValidationIssues("query", result.error)));
                return;
            }

            const paginationParams = toPaginationParams(result.data, options);
            req.pagination = paginationParams;

            assignParsedValue(req, "query", {
                ...rawQuery,
                page: result.data.page,
                limit: result.data.limit,
            });

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * Express middleware that validates and parses pagination query parameters (`page`, `limit`),
 * populates `req.pagination` with `{ page, limit, offset, skip, take }`, and coerces
 * numeric values into `req.query`.
 *
 * Can be used as a factory:
 * ```ts
 * app.get("/items", paginate(), handler);
 * app.get("/items", paginate({ defaultLimit: 50, maxLimit: 200 }), handler);
 * ```
 * Or directly as middleware:
 * ```ts
 * app.get("/items", paginate, handler);
 * ```
 */
export function paginate(options?: PaginateOptions): RequestHandler;
export function paginate(req: Request, res: Response, next: NextFunction): void | Promise<void>;
export function paginate(
    optionsOrReq?: PaginateOptions | Request,
    res?: Response,
    next?: NextFunction,
): RequestHandler | void | Promise<void> {
    if (res && typeof next === "function") {
        return createPaginateMiddleware()(optionsOrReq as Request, res, next) as void | Promise<void>;
    }
    return createPaginateMiddleware(optionsOrReq as PaginateOptions | undefined);
}

export const pagination = paginate;
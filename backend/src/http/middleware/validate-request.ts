import type { NextFunction, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import { RequestValidationError, type RequestValidationTarget, type ValidationIssue } from "./errors.js";

export * from "./errors.js";

export interface RequestValidationSchemas<
    TBody extends z.ZodType = z.ZodType,
    TQuery extends z.ZodType = z.ZodType,
    TParams extends z.ZodType = z.ZodType,
> {
    readonly body?: TBody;
    readonly query?: TQuery;
    readonly params?: TParams;
}

function formatZodPath(path: readonly PropertyKey[]): string {
    return path.map(segment => String(segment)).join(".");
}

function toValidationIssues(target: RequestValidationTarget, error: z.ZodError): ValidationIssue[] {
    return error.issues.map(issue => ({
        target,
        path: formatZodPath(issue.path),
        message: issue.message,
        code: issue.code,
    }));
}

function assignParsedValue(req: Request, target: RequestValidationTarget, value: unknown): void {
    const descriptor = Object.getOwnPropertyDescriptor(req, target);
    if (descriptor && descriptor.writable && !descriptor.get) {
        (req as unknown as Record<string, unknown>)[target] = value;
        return;
    }

    Object.defineProperty(req, target, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
    });
}

/**
 * Express middleware that validates `req.params`, `req.query`, and/or `req.body`
 * against the provided Zod schemas.
 *
 * - Replaces each validated request property with the parsed/coerced Zod output.
 * - On validation failure, forwards a `RequestValidationError` (400) to `next(err)`.
 */
export function validateRequest<
    TBody extends z.ZodType = z.ZodType,
    TQuery extends z.ZodType = z.ZodType,
    TParams extends z.ZodType = z.ZodType,
>(schemas: RequestValidationSchemas<TBody, TQuery, TParams>): RequestHandler {
    return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const issues: ValidationIssue[] = [];

            if (schemas.params) {
                const result = await schemas.params.safeParseAsync(req.params);
                if (result.success) {
                    assignParsedValue(req, "params", result.data);
                } else {
                    issues.push(...toValidationIssues("params", result.error));
                }
            }

            if (schemas.query) {
                const result = await schemas.query.safeParseAsync(req.query);
                if (result.success) {
                    assignParsedValue(req, "query", result.data);
                } else {
                    issues.push(...toValidationIssues("query", result.error));
                }
            }

            if (schemas.body) {
                const result = await schemas.body.safeParseAsync(req.body);
                if (result.success) {
                    assignParsedValue(req, "body", result.data);
                } else {
                    issues.push(...toValidationIssues("body", result.error));
                }
            }

            if (issues.length > 0) {
                next(new RequestValidationError(issues));
                return;
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

export function validateBody<TBody extends z.ZodType>(schema: TBody): RequestHandler {
    return validateRequest({ body: schema });
}

export function validateQuery<TQuery extends z.ZodType>(schema: TQuery): RequestHandler {
    return validateRequest({ query: schema });
}

export function validateParams<TParams extends z.ZodType>(schema: TParams): RequestHandler {
    return validateRequest({ params: schema });
}


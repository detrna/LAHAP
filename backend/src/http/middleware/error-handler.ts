import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/app-error.js";
import type { Logger } from "../../shared/ports/logger/logger.js";
import { createErrorResponse, type ErrorResponseBody } from "../../shared/response/index.js";
import { RequestValidationError } from "./errors.js";

export type { ErrorResponseBody } from "../../shared/response/index.js";

export interface ErrorHandlerOptions {
    readonly logger?: Logger | undefined;
}

function isMalformedJsonError(
    err: unknown,
): err is SyntaxError & { status?: number; statusCode?: number; type?: string; body?: unknown } {
    if (!(err instanceof SyntaxError)) {
        return false;
    }
    const candidate = err as SyntaxError & {
        status?: number;
        statusCode?: number;
        type?: string;
        body?: unknown;
    };
    return (
        candidate.status === 400 ||
        candidate.statusCode === 400 ||
        candidate.type === "entity.parse.failed" ||
        "body" in candidate
    );
}

export function errorHandler(options: ErrorHandlerOptions = {}): ErrorRequestHandler {
    const { logger } = options;

    return (err: unknown, req: Request, res: Response, next: NextFunction): void => {
        if (res.headersSent) {
            next(err);
            return;
        }

        const requestContext = {
            method: req.method,
            path: req.originalUrl ?? req.path,
        };

        if (err instanceof RequestValidationError) {
            logger?.warn(
                {
                    err,
                    ...requestContext,
                    statusCode: err.statusCode,
                    code: err.code,
                    issues: err.issues,
                },
                err.message,
            );

            res.status(err.statusCode).json(
                createErrorResponse(err.code, err.message, err.issues),
            );
            return;
        }

        if (err instanceof AppError) {
            const logContext = {
                err,
                ...requestContext,
                statusCode: err.statusCode,
                code: err.code,
            };

            if (err.statusCode >= 500) {
                logger?.error(logContext, err.message);
            } else {
                logger?.warn(logContext, err.message);
            }

            res.status(err.statusCode).json(
                createErrorResponse(err.code, err.message),
            );
            return;
        }

        if (isMalformedJsonError(err)) {
            const message = "malformed JSON in request body";
            logger?.warn(
                {
                    err,
                    ...requestContext,
                    statusCode: 400,
                    code: "INVALID_JSON",
                },
                message,
            );

            res.status(400).json(
                createErrorResponse("INVALID_JSON", message),
            );
            return;
        }

        logger?.error(
            {
                err: err instanceof Error ? err : new Error(String(err)),
                ...requestContext,
                statusCode: 500,
                code: "INTERNAL_SERVER_ERROR",
            },
            err instanceof Error ? err.message : "unhandled error",
        );

        res.status(500).json(
            createErrorResponse("INTERNAL_SERVER_ERROR", "internal server error"),
        );
    };
}


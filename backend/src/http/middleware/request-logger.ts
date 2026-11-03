import { randomUUID } from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Logger } from "../../shared/ports/logger/logger.js";

declare global {
    namespace Express {
        interface Request {
            id?: string;
        }
    }
}

export const REQUEST_ID_HEADER = "X-Request-Id";

const SAFE_REQUEST_ID = /^[\w-]{1,64}$/;

export interface RequestLoggerOptions {
    readonly logger: Logger;
    readonly ignorePaths?: readonly string[] | undefined;
}

export function resolveRequestId(header: string | string[] | undefined): string {
    const candidate = Array.isArray(header) ? header[0] : header;
    return candidate !== undefined && SAFE_REQUEST_ID.test(candidate) ? candidate : randomUUID();
}

export function requestLogger(options: RequestLoggerOptions): RequestHandler {
    const { logger } = options;
    const ignoredPaths = new Set(options.ignorePaths ?? ["/health"]);

    return (req: Request, res: Response, next: NextFunction): void => {
        const requestId = resolveRequestId(req.headers["x-request-id"]);
        req.id = requestId;
        res.setHeader(REQUEST_ID_HEADER, requestId);

        const path = req.originalUrl.split("?", 1)[0] ?? "/";
        if (ignoredPaths.has(path)) {
            next();
            return;
        }

        const startedAt = process.hrtime.bigint();
        res.once("close", () => {
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
            logger.info(
                {
                    requestId,
                    method: req.method,
                    path,
                    statusCode: res.statusCode,
                    durationMs: Math.round(durationMs * 10) / 10,
                    ...(req.user !== undefined ? { userId: req.user.userId } : {}),
                    ...(res.writableFinished ? {} : { aborted: true }),
                },
                "request completed",
            );
        });

        next();
    };
}

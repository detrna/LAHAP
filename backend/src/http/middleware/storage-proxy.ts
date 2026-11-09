import { pipeline } from "node:stream/promises";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ObjectStorage } from "../../shared/ports/object-storage/object-storage.js";

export const FORWARDED_REQUEST_HEADERS = ["range", "if-none-match", "if-modified-since"] as const;

export const RETURNED_RESPONSE_HEADERS = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
    "cache-control",
    "expires",
] as const;

export interface StorageProxyOptions {
    readonly storage: Pick<ObjectStorage, "signedUrlPathPrefix" | "forwardSignedRead">;
}

function isSignedRead(req: Request, prefix: string): boolean {
    if (req.method !== "GET" && req.method !== "HEAD") return false;
    const [path = "", query = ""] = req.originalUrl.split("?", 2);
    return path.startsWith(prefix) && path.length > prefix.length && new URLSearchParams(query).has("X-Amz-Signature");
}

function pickRequestHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const name of FORWARDED_REQUEST_HEADERS) {
        const value = req.headers[name];
        if (typeof value === "string") headers[name] = value;
    }
    return headers;
}

export function storageProxy({ storage }: StorageProxyOptions): RequestHandler {
    const prefix = `${storage.signedUrlPathPrefix}/`;

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!isSignedRead(req, prefix)) {
            next();
            return;
        }

        let upstream;
        try {
            upstream = await storage.forwardSignedRead({
                method: req.method === "HEAD" ? "HEAD" : "GET",
                pathWithQuery: req.originalUrl,
                headers: pickRequestHeaders(req),
            });
        } catch (err) {
            next(err);
            return;
        }

        res.status(upstream.status);
        for (const name of RETURNED_RESPONSE_HEADERS) {
            const value = upstream.headers[name];
            if (value !== undefined) res.setHeader(name, value);
        }
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

        if (req.method === "HEAD") {
            upstream.body.resume();
            res.end();
            return;
        }

        try {
            await pipeline(upstream.body, res);
        } catch {
            res.destroy();
        }
    };
}

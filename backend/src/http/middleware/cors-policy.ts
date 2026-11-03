import cors from "cors";
import type { RequestHandler } from "express";
import { REQUEST_ID_HEADER } from "./request-logger.js";

export interface CorsPolicyOptions {
    readonly origins: readonly string[];
}

export function corsPolicy(options: CorsPolicyOptions): RequestHandler {
    return cors({
        origin: [...options.origins],
        credentials: false,
        exposedHeaders: [REQUEST_ID_HEADER, "Retry-After"],
        maxAge: 600,
    });
}

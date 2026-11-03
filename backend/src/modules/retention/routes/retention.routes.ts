import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { RetentionController } from "../controller/retention.controller.js";

export interface RetentionRouterDeps {
    readonly controller: RetentionController;
    readonly tokenProvider: TokenProvider;
}

export function createRetentionRouter(_deps: RetentionRouterDeps): Router {
    const router = Router();
    return router;
}

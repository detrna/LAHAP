import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { RealtimeController } from "../controller/realtime.controller.js";

export interface RealtimeRouterDeps {
    readonly controller: RealtimeController;
    readonly tokenProvider: TokenProvider;
}

export function createRealtimeRouter(_deps: RealtimeRouterDeps): Router {
    const router = Router();
    return router;
}

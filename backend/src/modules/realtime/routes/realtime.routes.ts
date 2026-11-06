import { Router } from "express";
import { authenticate, authorize } from "../../../http/middleware/index.js";
import { ROLES } from "../../../shared/auth/roles.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { RealtimeController } from "../controller/realtime.controller.js";

export interface RealtimeRouterDeps {
    readonly controller: RealtimeController;
    readonly tokenProvider: TokenProvider;
}

export function createRealtimeRouter({ controller, tokenProvider }: RealtimeRouterDeps): Router {
    const router = Router();

    router.get(
        "/realtime/stream",
        authenticate({ tokenProvider, allowQueryToken: true }),
        authorize(...ROLES),
        controller.stream,
    );

    return router;
}

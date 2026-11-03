import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { NotificationsController } from "../controller/notifications.controller.js";

export interface NotificationsRouterDeps {
    readonly controller: NotificationsController;
    readonly tokenProvider: TokenProvider;
}

export function createNotificationsRouter(_deps: NotificationsRouterDeps): Router {
    const router = Router();
    return router;
}

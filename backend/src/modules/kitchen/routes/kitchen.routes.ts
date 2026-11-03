import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { KitchenController } from "../controller/kitchen.controller.js";

export interface KitchenRouterDeps {
    readonly controller: KitchenController;
    readonly tokenProvider: TokenProvider;
}

export function createKitchenRouter(_deps: KitchenRouterDeps): Router {
    const router = Router();
    return router;
}

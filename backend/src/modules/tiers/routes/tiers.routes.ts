import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { TiersController } from "../controller/tiers.controller.js";

export interface TiersRouterDeps {
    readonly controller: TiersController;
    readonly tokenProvider: TokenProvider;
}

export function createTiersRouter(_deps: TiersRouterDeps): Router {
    const router = Router();
    return router;
}

import { Router } from "express";
import { authenticate, authorize, validateQuery } from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { KitchenController } from "../controller/kitchen.controller.js";
import { toCookQuerySchema } from "../schema/kitchen.schemas.js";

export interface KitchenRouterDeps {
    readonly controller: KitchenController;
    readonly tokenProvider: TokenProvider;
}

export function createKitchenRouter({ controller, tokenProvider }: KitchenRouterDeps): Router {
    const router = Router();
    router.get(
        "/kitchen/to-cook",
        authenticate({ tokenProvider }),
        authorize("KITCHEN", "ADMIN"),
        validateQuery(toCookQuerySchema),
        controller.getToCook,
    );
    return router;
}

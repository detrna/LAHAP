import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { DeliveryController } from "../controller/delivery.controller.js";

export interface DeliveryRouterDeps {
    readonly controller: DeliveryController;
    readonly tokenProvider: TokenProvider;
}

export function createDeliveryRouter(_deps: DeliveryRouterDeps): Router {
    const router = Router();
    return router;
}

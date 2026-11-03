import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { OrdersController } from "../controller/orders.controller.js";

export interface OrdersRouterDeps {
    readonly controller: OrdersController;
    readonly tokenProvider: TokenProvider;
}

export function createOrdersRouter(_deps: OrdersRouterDeps): Router {
    const router = Router();
    return router;
}

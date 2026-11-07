import { Router } from "express";
import { authenticate, authorize, validateQuery, validateRequest } from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { DeliveryController } from "../controller/delivery.controller.js";
import { deliveryListQuerySchema, obstacleCreateSchema, orderIdParamsSchema } from "../schema/delivery.schemas.js";

export interface DeliveryRouterDeps {
    readonly controller: DeliveryController;
    readonly tokenProvider: TokenProvider;
}

export function createDeliveryRouter({ controller, tokenProvider }: DeliveryRouterDeps): Router {
    const router = Router();
    router.get(
        "/courier/orders",
        authenticate({ tokenProvider }),
        authorize("COURIER"),
        validateQuery(deliveryListQuerySchema),
        controller.listMyDeliveries,
    );
    router.post(
        "/courier/orders/:id/obstacles",
        authenticate({ tokenProvider }),
        authorize("COURIER", "ADMIN"),
        validateRequest({ params: orderIdParamsSchema, body: obstacleCreateSchema }),
        controller.reportObstacle,
    );
    return router;
}

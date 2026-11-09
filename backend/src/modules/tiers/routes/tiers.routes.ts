import { Router } from "express";
import {
    authenticate,
    authorize,
    paginate,
    validateBody,
    validateParams,
    validateQuery,
    validateRequest,
} from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { TiersController } from "../controller/tiers.controller.js";
import {
    tierCreateSchema,
    tierIdParamsSchema,
    tierListQuerySchema,
    tierUpdateSchema,
} from "../schema/tiers.schemas.js";

export interface TiersRouterDeps {
    readonly controller: TiersController;
    readonly tokenProvider: TokenProvider;
}

export function createTiersRouter({ controller, tokenProvider }: TiersRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const admin = authorize("ADMIN");

    router.get("/tiers", controller.listPublicTiers);

    router.get("/me/membership", signedIn, authorize("CUSTOMER"), controller.getMyMembership);

    router.get("/admin/tiers", signedIn, admin, validateQuery(tierListQuerySchema), paginate(), controller.listTiers);
    router.post("/admin/tiers", signedIn, admin, validateBody(tierCreateSchema), controller.createTier);
    router.get("/admin/tiers/:id", signedIn, admin, validateParams(tierIdParamsSchema), controller.getTier);
    router.patch(
        "/admin/tiers/:id",
        signedIn,
        admin,
        validateRequest({ params: tierIdParamsSchema, body: tierUpdateSchema }),
        controller.updateTier,
    );
    router.delete("/admin/tiers/:id", signedIn, admin, validateParams(tierIdParamsSchema), controller.deleteTier);

    return router;
}

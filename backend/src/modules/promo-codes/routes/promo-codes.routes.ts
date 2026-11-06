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
import type { PromoCodesController } from "../controller/promo-codes.controller.js";
import {
    promoCodeCreateSchema,
    promoCodeIdParamsSchema,
    promoCodeListQuerySchema,
    promoCodeUpdateSchema,
} from "../schema/promo-codes.schemas.js";

export interface PromoCodesRouterDeps {
    readonly controller: PromoCodesController;
    readonly tokenProvider: TokenProvider;
}

export function createPromoCodesRouter({ controller, tokenProvider }: PromoCodesRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const admin = authorize("ADMIN");

    router.get(
        "/admin/promo-codes",
        signedIn,
        admin,
        validateQuery(promoCodeListQuerySchema),
        paginate(),
        controller.listPromoCodes,
    );
    router.post("/admin/promo-codes", signedIn, admin, validateBody(promoCodeCreateSchema), controller.createPromoCode);
    router.get(
        "/admin/promo-codes/:id",
        signedIn,
        admin,
        validateParams(promoCodeIdParamsSchema),
        controller.getPromoCode,
    );
    router.patch(
        "/admin/promo-codes/:id",
        signedIn,
        admin,
        validateRequest({ params: promoCodeIdParamsSchema, body: promoCodeUpdateSchema }),
        controller.updatePromoCode,
    );
    router.delete(
        "/admin/promo-codes/:id",
        signedIn,
        admin,
        validateParams(promoCodeIdParamsSchema),
        controller.deletePromoCode,
    );

    return router;
}

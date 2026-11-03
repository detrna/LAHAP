import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { PromoCodesController } from "../controller/promo-codes.controller.js";

export interface PromoCodesRouterDeps {
    readonly controller: PromoCodesController;
    readonly tokenProvider: TokenProvider;
}

export function createPromoCodesRouter(_deps: PromoCodesRouterDeps): Router {
    const router = Router();
    return router;
}

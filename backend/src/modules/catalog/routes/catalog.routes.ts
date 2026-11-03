import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { CatalogController } from "../controller/catalog.controller.js";

export interface CatalogRouterDeps {
    readonly controller: CatalogController;
    readonly tokenProvider: TokenProvider;
}

export function createCatalogRouter(_deps: CatalogRouterDeps): Router {
    const router = Router();
    return router;
}

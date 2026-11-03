import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { IngredientsController } from "../controller/ingredients.controller.js";

export interface IngredientsRouterDeps {
    readonly controller: IngredientsController;
    readonly tokenProvider: TokenProvider;
}

export function createIngredientsRouter(_deps: IngredientsRouterDeps): Router {
    const router = Router();
    return router;
}

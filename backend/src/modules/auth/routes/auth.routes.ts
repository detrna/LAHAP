import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { AuthController } from "../controller/auth.controller.js";

export interface AuthRouterDeps {
    readonly controller: AuthController;
    readonly tokenProvider: TokenProvider;
}

export function createAuthRouter(_deps: AuthRouterDeps): Router {
    const router = Router();
    return router;
}

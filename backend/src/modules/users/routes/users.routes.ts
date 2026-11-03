import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { UsersController } from "../controller/users.controller.js";

export interface UsersRouterDeps {
    readonly controller: UsersController;
    readonly tokenProvider: TokenProvider;
}

export function createUsersRouter(_deps: UsersRouterDeps): Router {
    const router = Router();
    return router;
}

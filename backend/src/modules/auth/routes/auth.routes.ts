import cookieParser from "cookie-parser";
import { Router } from "express";
import { rateLimit, validateBody } from "../../../http/middleware/index.js";
import type { Cache } from "../../../shared/ports/cache/cache.js";
import type { Logger } from "../../../shared/ports/logger/logger.js";
import type { AuthController } from "../controller/auth.controller.js";
import { loginSchema, refreshSchema, registerSchema } from "../schema/auth.schemas.js";

export interface AuthRouterDeps {
    readonly controller: AuthController;
    readonly cache: Cache;
    readonly logger: Logger;
    readonly rateLimit: { readonly limit: number; readonly windowSeconds: number };
}

export function createAuthRouter({ controller, cache, logger, rateLimit: limits }: AuthRouterDeps): Router {
    const router = Router();

    router.post(
        "/auth/register",
        rateLimit({ cache, logger, name: "register", ...limits }),
        validateBody(registerSchema),
        controller.register,
    );
    router.post(
        "/auth/login",
        rateLimit({ cache, logger, name: "login", ...limits }),
        validateBody(loginSchema),
        controller.login,
    );
    router.post("/auth/refresh", cookieParser(), validateBody(refreshSchema), controller.refresh);
    router.post("/auth/logout", cookieParser(), validateBody(refreshSchema), controller.logout);

    return router;
}

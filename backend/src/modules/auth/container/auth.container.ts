import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { AuthController } from "../controller/auth.controller.js";
import { PrismaAuthRepository } from "../repository/prisma/auth-repository.js";
import { createAuthRouter } from "../routes/auth.routes.js";
import { AuthService } from "../service/auth.service.js";
import type { UserAccounts } from "../service/interfaces/user-accounts.js";

export interface AuthContainerDeps extends ModuleDeps {
    readonly users: UserAccounts;
}

export class AuthContainer {
    readonly service: AuthService;
    readonly router: Router;

    constructor({ db, adapters, http, users }: AuthContainerDeps) {
        const repository = new PrismaAuthRepository(db);
        this.service = new AuthService(repository, users, adapters.tokenProvider, adapters.clock);
        const controller = new AuthController(this.service, {
            name: http.AUTH_COOKIE_NAME,
            sameSite: http.AUTH_COOKIE_SAME_SITE,
            secure: http.AUTH_COOKIE_SECURE,
        });
        this.router = createAuthRouter({
            controller,
            cache: adapters.cache,
            logger: adapters.logger,
            rateLimit: { limit: http.AUTH_RATE_LIMIT_MAX, windowSeconds: http.AUTH_RATE_LIMIT_WINDOW_SECONDS },
        });
    }
}

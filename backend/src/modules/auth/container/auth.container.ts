import type { Router } from "express";
import type { ModuleDeps } from "../../module-deps.js";
import { AuthController } from "../controller/auth.controller.js";
import { createAuthRouter } from "../routes/auth.routes.js";
import { AuthService } from "../service/auth.service.js";

export class AuthContainer {
    readonly service: AuthService;
    readonly router: Router;

    constructor({ adapters }: ModuleDeps) {
        this.service = new AuthService();
        const controller = new AuthController(this.service);
        this.router = createAuthRouter({ controller, tokenProvider: adapters.tokenProvider });
    }
}

import { Router } from "express";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { SettingsController } from "../controller/settings.controller.js";

export interface SettingsRouterDeps {
    readonly controller: SettingsController;
    readonly tokenProvider: TokenProvider;
}

export function createSettingsRouter(_deps: SettingsRouterDeps): Router {
    const router = Router();
    return router;
}

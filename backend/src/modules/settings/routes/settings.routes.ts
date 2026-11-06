import { Router } from "express";
import { authenticate, authorize, validateBody } from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { SettingsController } from "../controller/settings.controller.js";
import { settingsUpdateSchema } from "../schema/settings.schemas.js";

export interface SettingsRouterDeps {
    readonly controller: SettingsController;
    readonly tokenProvider: TokenProvider;
}

export function createSettingsRouter({ controller, tokenProvider }: SettingsRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const admin = authorize("ADMIN");

    router.get("/business", controller.getBusinessInfo);

    router.get("/admin/settings", signedIn, admin, controller.getSettings);
    router.put("/admin/settings", signedIn, admin, validateBody(settingsUpdateSchema), controller.updateSettings);

    return router;
}

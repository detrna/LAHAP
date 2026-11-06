import { Router } from "express";
import {
    authenticate,
    authorize,
    paginate,
    validateBody,
    validateParams,
    validateQuery,
    validateRequest,
} from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { CatalogController } from "../controller/catalog.controller.js";
import {
    allergyCreateSchema,
    allergyIdParamsSchema,
    allergyListQuerySchema,
    allergyUpdateSchema,
    availablePackageListQuerySchema,
    packageCreateSchema,
    packageIdParamsSchema,
    packageListQuerySchema,
    packageUpdateSchema,
} from "../schema/catalog.schemas.js";

export interface CatalogRouterDeps {
    readonly controller: CatalogController;
    readonly tokenProvider: TokenProvider;
}

export function createCatalogRouter({ controller, tokenProvider }: CatalogRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const admin = authorize("ADMIN");

    router.get("/allergies", controller.listAllergies);
    router.get(
        "/packages",
        validateQuery(availablePackageListQuerySchema),
        paginate(),
        controller.listAvailablePackages,
    );
    router.get("/packages/:id", validateParams(packageIdParamsSchema), controller.getAvailablePackage);

    router.get(
        "/admin/allergies",
        signedIn,
        admin,
        validateQuery(allergyListQuerySchema),
        paginate(),
        controller.listAdminAllergies,
    );
    router.post("/admin/allergies", signedIn, admin, validateBody(allergyCreateSchema), controller.createAllergy);
    router.get("/admin/allergies/:id", signedIn, admin, validateParams(allergyIdParamsSchema), controller.getAllergy);
    router.patch(
        "/admin/allergies/:id",
        signedIn,
        admin,
        validateRequest({ params: allergyIdParamsSchema, body: allergyUpdateSchema }),
        controller.updateAllergy,
    );
    router.delete(
        "/admin/allergies/:id",
        signedIn,
        admin,
        validateParams(allergyIdParamsSchema),
        controller.deleteAllergy,
    );

    router.get(
        "/admin/packages",
        signedIn,
        admin,
        validateQuery(packageListQuerySchema),
        paginate(),
        controller.listPackages,
    );
    router.post("/admin/packages", signedIn, admin, validateBody(packageCreateSchema), controller.createPackage);
    router.get("/admin/packages/:id", signedIn, admin, validateParams(packageIdParamsSchema), controller.getPackage);
    router.patch(
        "/admin/packages/:id",
        signedIn,
        admin,
        validateRequest({ params: packageIdParamsSchema, body: packageUpdateSchema }),
        controller.updatePackage,
    );
    router.delete(
        "/admin/packages/:id",
        signedIn,
        admin,
        validateParams(packageIdParamsSchema),
        controller.deletePackage,
    );

    return router;
}

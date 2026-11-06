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
    menuCreateSchema,
    menuIdParamsSchema,
    menuListQuerySchema,
    menuScheduleBatchCreateSchema,
    menuScheduleBatchDeleteSchema,
    menuScheduleBatchUpdateSchema,
    menuScheduleIdParamsSchema,
    menuScheduleListQuerySchema,
    menuScheduleUpdateSchema,
    menuUpdateSchema,
    packageCreateSchema,
    packageIdParamsSchema,
    packageListQuerySchema,
    packageScheduleQuerySchema,
    packageUpdateSchema,
    publishMenuSchedulesSchema,
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
        "/packages/:id/schedules",
        validateRequest({ params: packageIdParamsSchema, query: packageScheduleQuerySchema }),
        controller.listPackageSchedules,
    );

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

    router.get("/admin/menus", signedIn, admin, validateQuery(menuListQuerySchema), paginate(), controller.listMenus);
    router.post("/admin/menus", signedIn, admin, validateBody(menuCreateSchema), controller.createMenu);
    router.get("/admin/menus/:id", signedIn, admin, validateParams(menuIdParamsSchema), controller.getMenu);
    router.patch(
        "/admin/menus/:id",
        signedIn,
        admin,
        validateRequest({ params: menuIdParamsSchema, body: menuUpdateSchema }),
        controller.updateMenu,
    );
    router.delete("/admin/menus/:id", signedIn, admin, validateParams(menuIdParamsSchema), controller.deleteMenu);

    router.get(
        "/admin/menu-schedules",
        signedIn,
        admin,
        validateQuery(menuScheduleListQuerySchema),
        paginate(),
        controller.listSchedules,
    );
    router.post(
        "/admin/menu-schedules",
        signedIn,
        admin,
        validateBody(menuScheduleBatchCreateSchema),
        controller.createSchedules,
    );
    router.patch(
        "/admin/menu-schedules",
        signedIn,
        admin,
        validateBody(menuScheduleBatchUpdateSchema),
        controller.updateSchedules,
    );
    router.delete(
        "/admin/menu-schedules",
        signedIn,
        admin,
        validateBody(menuScheduleBatchDeleteSchema),
        controller.deleteSchedules,
    );
    router.post(
        "/admin/menu-schedules/publish",
        signedIn,
        admin,
        validateBody(publishMenuSchedulesSchema),
        controller.publishSchedules,
    );
    router.get(
        "/admin/menu-schedules/:id",
        signedIn,
        admin,
        validateParams(menuScheduleIdParamsSchema),
        controller.getSchedule,
    );
    router.patch(
        "/admin/menu-schedules/:id",
        signedIn,
        admin,
        validateRequest({ params: menuScheduleIdParamsSchema, body: menuScheduleUpdateSchema }),
        controller.updateSchedule,
    );

    return router;
}

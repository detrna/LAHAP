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
import { ROLES } from "../../../shared/auth/roles.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { UsersController } from "../controller/users.controller.js";
import {
    passwordChangeSchema,
    profileUpdateSchema,
    userCreateSchema,
    userIdParamsSchema,
    userListQuerySchema,
    userUpdateSchema,
} from "../schema/users.schemas.js";

export interface UsersRouterDeps {
    readonly controller: UsersController;
    readonly tokenProvider: TokenProvider;
}

export function createUsersRouter({ controller, tokenProvider }: UsersRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const anyRole = authorize(ROLES);
    const admin = authorize("ADMIN");

    router.get("/me", signedIn, anyRole, controller.getMe);
    router.patch("/me", signedIn, anyRole, validateBody(profileUpdateSchema), controller.updateMe);
    router.put("/me/password", signedIn, anyRole, validateBody(passwordChangeSchema), controller.changeMyPassword);

    router.get("/admin/users", signedIn, admin, validateQuery(userListQuerySchema), paginate(), controller.listUsers);
    router.post("/admin/users", signedIn, admin, validateBody(userCreateSchema), controller.createUser);
    router.get("/admin/users/:id", signedIn, admin, validateParams(userIdParamsSchema), controller.getUser);
    router.patch(
        "/admin/users/:id",
        signedIn,
        admin,
        validateRequest({ params: userIdParamsSchema, body: userUpdateSchema }),
        controller.updateUser,
    );

    return router;
}

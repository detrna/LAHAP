import { Router } from "express";
import {
    authenticate,
    authorize,
    paginate,
    uploadImage,
    validateBody,
    validateParams,
    validateQuery,
    validateRequest,
} from "../../../http/middleware/index.js";
import type { TokenProvider } from "../../../shared/ports/token-provider/token-provider.js";
import type { IngredientsController } from "../controller/ingredients.controller.js";
import {
    ingredientBatchCreateSchema,
    ingredientBatchDeleteSchema,
    ingredientBatchUpdateSchema,
    ingredientIdParamsSchema,
    ingredientListQuerySchema,
    ingredientUpdateSchema,
    shoppingListQuerySchema,
    stockUpdateSchema,
} from "../schema/ingredients.schemas.js";

export interface IngredientsRouterDeps {
    readonly controller: IngredientsController;
    readonly tokenProvider: TokenProvider;
    readonly maxBytes: number;
}

export function createIngredientsRouter({ controller, tokenProvider, maxBytes }: IngredientsRouterDeps): Router {
    const router = Router();
    const signedIn = authenticate({ tokenProvider });
    const admin = authorize("ADMIN");
    const staff = authorize("KITCHEN", "ADMIN");

    router.get(
        "/admin/ingredients",
        signedIn,
        admin,
        validateQuery(ingredientListQuerySchema),
        paginate(),
        controller.listIngredients,
    );
    router.post(
        "/admin/ingredients",
        signedIn,
        admin,
        validateBody(ingredientBatchCreateSchema),
        controller.createIngredients,
    );
    router.patch(
        "/admin/ingredients",
        signedIn,
        admin,
        validateBody(ingredientBatchUpdateSchema),
        controller.updateIngredients,
    );
    router.get(
        "/admin/ingredients/shopping-list",
        signedIn,
        admin,
        validateQuery(shoppingListQuerySchema),
        controller.getShoppingList,
    );
    router.delete(
        "/admin/ingredients",
        signedIn,
        admin,
        validateBody(ingredientBatchDeleteSchema),
        controller.deleteIngredients,
    );
    router.get(
        "/admin/ingredients/:id",
        signedIn,
        admin,
        validateParams(ingredientIdParamsSchema),
        controller.getIngredient,
    );
    router.patch(
        "/admin/ingredients/:id",
        signedIn,
        admin,
        validateRequest({ params: ingredientIdParamsSchema, body: ingredientUpdateSchema }),
        controller.updateIngredient,
    );

    router.get(
        "/kitchen/ingredients",
        signedIn,
        staff,
        validateQuery(ingredientListQuerySchema),
        paginate(),
        controller.listIngredients,
    );
    router.put(
        "/kitchen/ingredients/:id/stock",
        signedIn,
        staff,
        validateRequest({ params: ingredientIdParamsSchema, body: stockUpdateSchema }),
        controller.updateStock,
    );

    router.post(
        "/kitchen/ingredients/:id/photo-estimate",
        signedIn,
        staff,
        uploadImage({ field: "image", maxBytes }),
        validateParams(ingredientIdParamsSchema),
        controller.estimateStock,
    );

    return router;
}

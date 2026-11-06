import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { IngredientIdParams, IngredientUpdateBody } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function updateIngredient(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as IngredientIdParams;
    res.json(
        createSuccessResponse(await this.ingredientsService.updateIngredient(id, req.body as IngredientUpdateBody)),
    );
}

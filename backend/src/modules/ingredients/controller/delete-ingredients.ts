import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { IngredientBatchDeleteBody } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function deleteIngredients(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { ids } = req.body as IngredientBatchDeleteBody;
    res.json(createSuccessResponse(await this.ingredientsService.deleteIngredients(ids)));
}

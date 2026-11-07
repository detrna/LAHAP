import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { IngredientBatchUpdateBody } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function updateIngredients(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { items } = req.body as IngredientBatchUpdateBody;
    res.json(createSuccessResponse(await this.ingredientsService.updateIngredients(items, req.user!.userId)));
}

import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { IngredientBatchCreateBody } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function createIngredients(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { items } = req.body as IngredientBatchCreateBody;
    res.status(201).json(createSuccessResponse(await this.ingredientsService.createIngredients(items)));
}

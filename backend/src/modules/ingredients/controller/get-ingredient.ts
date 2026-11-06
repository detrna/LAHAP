import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { IngredientIdParams } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function getIngredient(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as IngredientIdParams;
    res.json(createSuccessResponse(await this.ingredientsService.getIngredient(id)));
}

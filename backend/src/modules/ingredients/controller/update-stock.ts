import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { IngredientIdParams, StockUpdateBody } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function updateStock(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as IngredientIdParams;
    const { stock } = req.body as StockUpdateBody;
    res.json(createSuccessResponse(await this.ingredientsService.updateStock(id, stock)));
}

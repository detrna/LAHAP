import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { IngredientIdParams } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function estimateStock(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as IngredientIdParams;
    const file = req.file as Express.Multer.File;
    const estimate = await this.ingredientsService.estimateStock(id, { image: file.buffer, mimeType: file.mimetype });
    res.json(createSuccessResponse(estimate));
}

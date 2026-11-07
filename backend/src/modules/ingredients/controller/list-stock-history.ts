import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../shared/response/index.js";
import type { IngredientIdParams } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function listStockHistory(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as IngredientIdParams;
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { items, total } = await this.ingredientsService.listStockHistory(id, { skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

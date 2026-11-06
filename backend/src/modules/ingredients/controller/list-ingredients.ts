import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../shared/response/index.js";
import type { IngredientListQuery } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function listIngredients(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { search, lowStock } = req.query as unknown as IngredientListQuery;
    const { items, total } = await this.ingredientsService.listIngredients({ search, lowStock, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

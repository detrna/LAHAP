import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { ShoppingListQuery } from "../schema/ingredients.schemas.js";
import type { IngredientsController } from "./ingredients.controller.js";

export async function getShoppingList(this: IngredientsController, req: Request, res: Response): Promise<void> {
    const { from, to } = req.query as unknown as ShoppingListQuery;
    res.json(createSuccessResponse(await this.ingredientsService.getShoppingList({ from, to })));
}

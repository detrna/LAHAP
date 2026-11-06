import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { FoodReadyBody } from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function markFoodReady(this: OrdersController, req: Request, res: Response): Promise<void> {
    res.json(
        createSuccessResponse(await this.ordersService.markFoodReady(req.user!.userId, req.body as FoodReadyBody)),
    );
}

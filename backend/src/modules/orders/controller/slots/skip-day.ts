import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { SkipDayBody } from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function skipDay(this: OrdersController, req: Request, res: Response): Promise<void> {
    res.json(createSuccessResponse(await this.ordersService.skipDay(req.user!.userId, req.body as SkipDayBody)));
}

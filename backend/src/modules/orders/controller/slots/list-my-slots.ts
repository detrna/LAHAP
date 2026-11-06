import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { SlotDateQuery } from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function listMySlots(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { date } = req.query as unknown as SlotDateQuery;
    res.json(createSuccessResponse(await this.ordersService.listMySlots(req.user!.userId, date)));
}

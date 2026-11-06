import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { SkipBody } from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function skipSlot(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    const { skipReason } = req.body as SkipBody;
    res.json(createSuccessResponse(await this.ordersService.skipSlot(req.user!.userId, id, skipReason)));
}

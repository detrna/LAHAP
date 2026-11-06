import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { OrdersController } from "../orders.controller.js";

export async function handleMidtransNotification(this: OrdersController, req: Request, res: Response): Promise<void> {
    await this.ordersService.handleMidtransNotification(req.body);
    res.json(createSuccessResponse({ received: true }));
}

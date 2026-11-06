import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { OrdersController } from "../orders.controller.js";

export async function getPaymentSession(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as { id: string };
    res.json(createSuccessResponse(await this.ordersService.getPaymentSession(req.user!.userId, id)));
}

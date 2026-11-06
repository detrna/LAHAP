import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { CheckoutBody } from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function createSubscription(this: OrdersController, req: Request, res: Response): Promise<void> {
    const result = await this.ordersService.createSubscription(req.user!.userId, req.body as CheckoutBody);
    res.status(201).json(createSuccessResponse(result));
}

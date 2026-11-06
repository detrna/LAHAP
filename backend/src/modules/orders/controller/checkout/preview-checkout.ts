import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../../shared/response/index.js";
import type { CheckoutBody } from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function previewCheckout(this: OrdersController, req: Request, res: Response): Promise<void> {
    res.json(
        createSuccessResponse(await this.ordersService.previewCheckout(req.user!.userId, req.body as CheckoutBody)),
    );
}

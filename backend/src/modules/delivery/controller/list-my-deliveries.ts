import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { DeliveryListQuery } from "../schema/delivery.schemas.js";
import type { DeliveryController } from "./delivery.controller.js";

export async function listMyDeliveries(this: DeliveryController, req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;
    const { date } = req.query as unknown as DeliveryListQuery;
    res.json(createSuccessResponse(await this.deliveryService.listMyDeliveries(userId, date)));
}

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { ObstacleCreate } from "../schema/delivery.schemas.js";
import type { DeliveryController } from "./delivery.controller.js";

export async function reportObstacle(this: DeliveryController, req: Request, res: Response): Promise<void> {
    const { userId, role } = (req as AuthenticatedRequest).user;
    const { id } = req.params as { id: string };
    const input = req.body as ObstacleCreate;
    const obstacle = await this.deliveryService.reportObstacle({ userId, role }, id, input);
    res.status(201).json(createSuccessResponse(obstacle));
}

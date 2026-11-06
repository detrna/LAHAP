import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { BroadcastBody } from "../schema/notifications.schemas.js";
import type { NotificationsController } from "./notifications.controller.js";

export async function broadcastNotification(this: NotificationsController, req: Request, res: Response): Promise<void> {
    const result = await this.notificationsService.broadcast(req.body as BroadcastBody);
    res.status(201).json(createSuccessResponse(result));
}

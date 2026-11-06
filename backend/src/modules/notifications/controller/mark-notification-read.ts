import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { NotificationIdParams } from "../schema/notifications.schemas.js";
import type { NotificationsController } from "./notifications.controller.js";

export async function markNotificationRead(this: NotificationsController, req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;
    const { id } = req.params as NotificationIdParams;
    res.json(createSuccessResponse(await this.notificationsService.markNotificationRead(userId, id)));
}

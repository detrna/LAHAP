import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "../../../http/middleware/index.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { NotificationsController } from "./notifications.controller.js";

export async function markAllNotificationsRead(
    this: NotificationsController,
    req: Request,
    res: Response,
): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;
    res.json(createSuccessResponse(await this.notificationsService.markAllNotificationsRead(userId)));
}

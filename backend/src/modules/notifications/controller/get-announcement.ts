import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { AnnouncementIdParams } from "../schema/notifications.schemas.js";
import type { NotificationsController } from "./notifications.controller.js";

export async function getAnnouncement(this: NotificationsController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as AnnouncementIdParams;
    res.json(createSuccessResponse(await this.notificationsService.getAnnouncement(id)));
}

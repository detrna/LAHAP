import type { Request, Response } from "express";
import type { AnnouncementIdParams } from "../schema/notifications.schemas.js";
import type { NotificationsController } from "./notifications.controller.js";

export async function deleteAnnouncement(this: NotificationsController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as AnnouncementIdParams;
    await this.notificationsService.deleteAnnouncement(id);
    res.status(204).end();
}

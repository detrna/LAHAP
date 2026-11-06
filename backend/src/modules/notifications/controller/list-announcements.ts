import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../shared/response/index.js";
import type { AnnouncementListQuery } from "../schema/notifications.schemas.js";
import type { NotificationsController } from "./notifications.controller.js";

export async function listAnnouncements(this: NotificationsController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { scope, packageId } = req.query as unknown as AnnouncementListQuery;
    const { items, total } = await this.notificationsService.listAnnouncements({ scope, packageId, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

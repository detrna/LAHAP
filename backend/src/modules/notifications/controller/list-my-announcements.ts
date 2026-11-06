import type { Request, Response } from "express";
import type { AuthenticatedRequest, PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../shared/response/index.js";
import type { NotificationsController } from "./notifications.controller.js";

export async function listMyAnnouncements(this: NotificationsController, req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { items, total } = await this.notificationsService.listMyAnnouncements(userId, { skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

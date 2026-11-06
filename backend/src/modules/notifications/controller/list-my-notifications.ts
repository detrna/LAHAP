import type { Request, Response } from "express";
import type { AuthenticatedRequest, PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginationMeta } from "../../../shared/pagination/index.js";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { NotificationListQuery } from "../schema/notifications.schemas.js";
import type { NotificationsController } from "./notifications.controller.js";

export async function listMyNotifications(this: NotificationsController, req: Request, res: Response): Promise<void> {
    const { userId } = (req as AuthenticatedRequest).user;
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { isRead } = req.query as unknown as NotificationListQuery;
    const { items, total, unreadCount } = await this.notificationsService.listMyNotifications(userId, {
        isRead,
        skip,
        take,
    });
    res.json(createSuccessResponse(items, { ...createPaginationMeta({ page, limit, total }), unreadCount }));
}

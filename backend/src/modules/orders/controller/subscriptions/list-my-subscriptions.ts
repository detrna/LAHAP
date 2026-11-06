import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../../shared/response/index.js";
import type { SubscriptionListQuery } from "../../schema/orders.schemas.js";
import type { OrdersController } from "../orders.controller.js";

export async function listMySubscriptions(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { status } = req.query as unknown as SubscriptionListQuery;
    const { items, total } = await this.ordersService.listMySubscriptions(req.user!.userId, { status, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

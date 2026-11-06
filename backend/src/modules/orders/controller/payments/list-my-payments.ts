import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../../shared/response/index.js";
import type { OrdersController } from "../orders.controller.js";

export async function listMyPayments(this: OrdersController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { items, total } = await this.ordersService.listMyPayments(req.user!.userId, { skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

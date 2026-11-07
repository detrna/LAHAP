import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../shared/response/index.js";
import type { ChurnListQuery } from "../schema/retention.schemas.js";
import type { RetentionController } from "./retention.controller.js";

export async function listChurnedCustomers(this: RetentionController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { search } = req.query as unknown as ChurnListQuery;
    const { items, total } = await this.retentionService.listChurnedCustomers({
        ...(search !== undefined ? { search } : {}),
        skip,
        take,
    });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

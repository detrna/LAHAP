import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../../shared/response/index.js";
import type { MenuScheduleListQuery } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function listSchedules(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { packageId, from, to, isPublished } = req.query as unknown as MenuScheduleListQuery;
    const { items, total } = await this.catalogService.listSchedules({ packageId, from, to, isPublished, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

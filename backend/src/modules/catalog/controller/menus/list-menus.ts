import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../../shared/response/index.js";
import type { MenuListQuery } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function listMenus(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { search, isAlternative } = req.query as unknown as MenuListQuery;
    const { items, total } = await this.catalogService.listMenus({ search, isAlternative, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

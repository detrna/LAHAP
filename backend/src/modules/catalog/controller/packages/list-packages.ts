import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../../shared/response/index.js";
import type { PackageListQuery } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function listPackages(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { search, isActive } = req.query as unknown as PackageListQuery;
    const { items, total } = await this.catalogService.listPackages({ search, isActive, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

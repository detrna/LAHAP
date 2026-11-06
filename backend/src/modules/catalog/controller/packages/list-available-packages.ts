import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../../shared/response/index.js";
import type { AvailablePackageListQuery } from "../../schema/catalog.schemas.js";
import type { CatalogController } from "../catalog.controller.js";

export async function listAvailablePackages(this: CatalogController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { search } = req.query as unknown as AvailablePackageListQuery;
    const { items, total } = await this.catalogService.listAvailablePackages({ search, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../shared/response/index.js";
import type { TiersController } from "./tiers.controller.js";

export async function listTiers(this: TiersController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { items, total } = await this.tiersService.listTiers({ skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

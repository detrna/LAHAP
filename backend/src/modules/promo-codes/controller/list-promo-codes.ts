import type { Request, Response } from "express";
import type { PaginatedRequest } from "../../../http/middleware/index.js";
import { createPaginatedResponse } from "../../../shared/response/index.js";
import type { PromoCodeListQuery } from "../schema/promo-codes.schemas.js";
import type { PromoCodesController } from "./promo-codes.controller.js";

export async function listPromoCodes(this: PromoCodesController, req: Request, res: Response): Promise<void> {
    const { page, limit, skip, take } = (req as PaginatedRequest).pagination;
    const { search, isActive } = req.query as unknown as PromoCodeListQuery;
    const { items, total } = await this.promoCodesService.listPromoCodes({ search, isActive, skip, take });
    res.json(createPaginatedResponse(items, { page, limit, total }));
}

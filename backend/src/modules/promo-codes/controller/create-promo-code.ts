import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { PromoCodeCreateBody } from "../schema/promo-codes.schemas.js";
import type { PromoCodesController } from "./promo-codes.controller.js";

export async function createPromoCode(this: PromoCodesController, req: Request, res: Response): Promise<void> {
    res.status(201).json(
        createSuccessResponse(await this.promoCodesService.createPromoCode(req.body as PromoCodeCreateBody)),
    );
}

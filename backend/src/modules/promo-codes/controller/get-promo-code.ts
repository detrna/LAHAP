import type { Request, Response } from "express";
import { createSuccessResponse } from "../../../shared/response/index.js";
import type { PromoCodeIdParams } from "../schema/promo-codes.schemas.js";
import type { PromoCodesController } from "./promo-codes.controller.js";

export async function getPromoCode(this: PromoCodesController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as PromoCodeIdParams;
    res.json(createSuccessResponse(await this.promoCodesService.getPromoCode(id)));
}

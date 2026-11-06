import type { Request, Response } from "express";
import type { PromoCodeIdParams } from "../schema/promo-codes.schemas.js";
import type { PromoCodesController } from "./promo-codes.controller.js";

export async function deletePromoCode(this: PromoCodesController, req: Request, res: Response): Promise<void> {
    const { id } = req.params as PromoCodeIdParams;
    await this.promoCodesService.deletePromoCode(id);
    res.status(204).end();
}

import type { PromoCheckResult } from "../domain/promo-check.js";
import type { PromoCodesService } from "./promo-codes.service.js";

export async function checkPromoForCustomer(
    this: PromoCodesService,
    code: string,
    userId: string,
): Promise<PromoCheckResult> {
    return this.checkPromo({ code, userId });
}

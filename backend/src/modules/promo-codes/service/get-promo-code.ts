import type { PromoCode } from "../domain/promo-code.domain.js";
import { PromoCodeNotFoundError } from "./interfaces/promo-codes.repository.js";
import type { PromoCodesService } from "./promo-codes.service.js";

export async function getPromoCode(this: PromoCodesService, id: string): Promise<PromoCode> {
    const record = await this.promoCodesRepository.findPromoCodeById(id);
    if (record === null) throw new PromoCodeNotFoundError(id);
    return this.presentPromoCode(record);
}

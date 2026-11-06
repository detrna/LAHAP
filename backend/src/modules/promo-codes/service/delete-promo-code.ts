import { PromoCodeInUseError, PromoCodeNotFoundError } from "./interfaces/promo-codes.repository.js";
import type { PromoCodesService } from "./promo-codes.service.js";

export async function deletePromoCode(this: PromoCodesService, id: string): Promise<void> {
    const existing = await this.promoCodesRepository.findPromoCodeById(id);
    if (existing === null) throw new PromoCodeNotFoundError(id);

    if (await this.promoUsage.hasPendingSubscriptions(id)) throw new PromoCodeInUseError(id);

    if (!(await this.promoCodesRepository.deletePromoCode(id))) throw new PromoCodeNotFoundError(id);
}

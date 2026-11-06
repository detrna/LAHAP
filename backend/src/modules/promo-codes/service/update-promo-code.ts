import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { assertDiscountValue, assertValidUntilInFuture } from "../domain/discount-rules.js";
import type { PromoCode } from "../domain/promo-code.domain.js";
import { PromoCodeNotFoundError, type PromoCodeChanges } from "./interfaces/promo-codes.repository.js";
import type { PromoCodesService } from "./promo-codes.service.js";

export type UpdatePromoCodeInput = PromoCodeChanges;

export async function updatePromoCode(
    this: PromoCodesService,
    id: string,
    input: UpdatePromoCodeInput,
): Promise<PromoCode> {
    const existing = await this.promoCodesRepository.findPromoCodeById(id);
    if (existing === null) throw new PromoCodeNotFoundError(id);

    if (input.discountType !== undefined || input.discountValue !== undefined) {
        assertDiscountValue(input.discountType ?? existing.discountType, input.discountValue ?? existing.discountValue);
    }
    if (input.validUntil !== undefined) {
        assertValidUntilInFuture(input.validUntil, toDbTimestamp(this.clock.now()));
    }

    const record = await this.promoCodesRepository.updatePromoCode(id, input);
    if (record === null) throw new PromoCodeNotFoundError(id);
    return this.presentPromoCode(record);
}

import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { normalizeCode } from "../domain/code-format.js";
import type { PromoCode } from "../domain/promo-code.domain.js";
import type { PromoCodesService } from "./promo-codes.service.js";

export async function findActiveCode(this: PromoCodesService, code: string): Promise<PromoCode | null> {
    const record = await this.promoCodesRepository.findPromoCodeByCode(normalizeCode(code));
    if (record === null || !record.isActive) return null;
    if (Temporal.PlainDateTime.compare(record.validUntil, toDbTimestamp(this.clock.now())) <= 0) return null;
    return this.presentPromoCode(record);
}

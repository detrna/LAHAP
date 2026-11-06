import type { PromoCode } from "../domain/promo-code.domain.js";
import type { PromoCodeRecord } from "./interfaces/promo-codes.repository.js";
import type { PromoCodesService } from "./promo-codes.service.js";
import { toPromoCode } from "./to-promo-code.js";

export async function presentPromoCodes(
    this: PromoCodesService,
    records: readonly PromoCodeRecord[],
): Promise<PromoCode[]> {
    if (records.length === 0) return [];

    const uses = await this.promoUsage.countPromoUses(records.map(record => record.id));
    return records.map(record => toPromoCode(record, uses.get(record.id) ?? 0));
}

export async function presentPromoCode(this: PromoCodesService, record: PromoCodeRecord): Promise<PromoCode> {
    const [promoCode] = await this.presentPromoCodes([record]);
    if (promoCode === undefined) throw new Error(`promo code ${record.id} missing from its own presentation`);
    return promoCode;
}

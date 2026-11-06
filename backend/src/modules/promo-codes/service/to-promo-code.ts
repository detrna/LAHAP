import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { PromoCode } from "../domain/promo-code.domain.js";
import type { PromoCodeRecord } from "./interfaces/promo-codes.repository.js";

export function toPromoCode(record: PromoCodeRecord, usedCount: number): PromoCode {
    return {
        id: record.id,
        code: record.code,
        discountType: record.discountType,
        discountValue: record.discountValue,
        minPurchase: record.minPurchase,
        allowStackWithTier: record.allowStackWithTier,
        validUntil: toIsoTimestamp(record.validUntil),
        quota: record.quota,
        usedCount,
        isActive: record.isActive,
        createdAt: toIsoTimestamp(record.createdAt),
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}

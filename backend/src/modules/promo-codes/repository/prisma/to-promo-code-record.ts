import { fromNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import type { DiscountType } from "../../domain/promo-code.domain.js";
import type { PromoCodeRecord } from "../../service/interfaces/promo-codes.repository.js";

export interface PromoCodeRow {
    readonly id: string;
    readonly code: string;
    readonly discountType: string;
    readonly discountValue: string;
    readonly minPurchase: string;
    readonly allowStackWithTier: boolean;
    readonly validUntil: Temporal.PlainDateTime;
    readonly quota: number;
    readonly isActive: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export function toPromoCodeRecord(row: PromoCodeRow): PromoCodeRecord {
    return {
        id: row.id,
        code: row.code,
        discountType: row.discountType as DiscountType,
        discountValue: fromNumeric(row.discountValue),
        minPurchase: fromNumeric(row.minPurchase),
        allowStackWithTier: row.allowStackWithTier,
        validUntil: row.validUntil,
        quota: row.quota,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}

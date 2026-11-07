import type { DiscountType, PromoCheck } from "./promo-code.domain.js";

export type PromoRejection = Exclude<NonNullable<PromoCheck["reason"]>, "TIER_DISCOUNT_LARGER">;

export interface ValidPromo {
    readonly id: string;
    readonly code: string;
    readonly discountType: DiscountType;
    readonly discountValue: number;
    readonly allowStackWithTier: boolean;
    readonly quota: number;
}

export type PromoCheckResult =
    | { readonly valid: true; readonly promoCode: ValidPromo }
    | { readonly valid: false; readonly code: string; readonly reason: PromoRejection };

export interface PromoCandidate extends ValidPromo {
    readonly minPurchase: number;
    readonly validUntil: Temporal.PlainDateTime;
    readonly isActive: boolean;
}

export interface PromoCheckContext {
    readonly usedCount: number;
    readonly userUseCount: number;
    readonly foodSubtotal?: number | undefined;
    readonly now: Temporal.PlainDateTime;
}

function rejectionOf(candidate: PromoCandidate, context: PromoCheckContext): PromoRejection | null {
    if (!candidate.isActive) return "INACTIVE";
    if (Temporal.PlainDateTime.compare(candidate.validUntil, context.now) <= 0) return "EXPIRED";
    if (context.usedCount >= candidate.quota) return "QUOTA_EXHAUSTED";
    if (context.userUseCount > 0) return "ALREADY_USED";
    if (context.foodSubtotal !== undefined && context.foodSubtotal < candidate.minPurchase) {
        return "MIN_PURCHASE_NOT_MET";
    }
    return null;
}

export function evaluatePromo(candidate: PromoCandidate, context: PromoCheckContext): PromoCheckResult {
    const reason = rejectionOf(candidate, context);
    if (reason !== null) return { valid: false, code: candidate.code, reason };
    const { id, code, discountType, discountValue, allowStackWithTier, quota } = candidate;
    return { valid: true, promoCode: { id, code, discountType, discountValue, allowStackWithTier, quota } };
}

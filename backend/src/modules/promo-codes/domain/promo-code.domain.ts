export const DISCOUNT_TYPES = ["Persen", "Nominal"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export interface PromoCode {
    readonly id: string;
    readonly code: string;
    readonly discountType: DiscountType;
    readonly discountValue: number;
    readonly minPurchase: number;
    readonly allowStackWithTier: boolean;
    readonly validUntil: string;
    readonly quota: number;
    readonly usedCount: number;
    readonly isActive: boolean;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface PromoCheck {
    readonly code: string;
    readonly applied: boolean;
    readonly reason:
        | (
              | "NOT_FOUND"
              | "INACTIVE"
              | "EXPIRED"
              | "QUOTA_EXHAUSTED"
              | "MIN_PURCHASE_NOT_MET"
              | "ALREADY_USED"
              | "TIER_DISCOUNT_LARGER"
          )
        | null;
}

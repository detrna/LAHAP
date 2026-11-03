import type { DiscountType } from "../../../../../../modules/promo-codes/domain/promo-code.domain.js";
import { seedId } from "../../shared/seed-id.js";

export interface PromoCodeSeed {
    readonly id: string;
    readonly code: string;
    readonly discountType: DiscountType;
    readonly discountValue: string;
    readonly minPurchase: string;
    readonly allowStackWithTier: boolean;
    readonly validForDays: number;
    readonly quota: number;
}

export const PROMO_CODES: readonly PromoCodeSeed[] = [
    {
        id: seedId("promoCode", 1),
        code: "MERDEKA",
        discountType: "Persen",
        discountValue: "10.00",
        minPurchase: "0.00",
        allowStackWithTier: true,
        validForDays: 14,
        quota: 100,
    },
    {
        id: seedId("promoCode", 2),
        code: "WINBACK",
        discountType: "Nominal",
        discountValue: "10000.00",
        minPurchase: "45000.00",
        allowStackWithTier: false,
        validForDays: 14,
        quota: 50,
    },
];

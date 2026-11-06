import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";
import type { DiscountType } from "../../promo-codes/domain/promo-code.domain.js";

const MONEY_SCALE = 2;
const GUARD_SCALE = 6;
const PERCENT = 100;

export interface TierDiscountInput {
    readonly tierId: string;
    readonly discountPercent: number;
}

export interface PromoDiscountInput {
    readonly discountType: DiscountType;
    readonly discountValue: number;
    readonly allowStackWithTier: boolean;
}

export interface OrderTotalInput {
    readonly pricePerPortion: number;
    readonly slotCount: number;
    readonly deliveryFeePerSlot: number;
    readonly tier: TierDiscountInput | null;
    readonly promo: PromoDiscountInput | null;
}

export interface OrderTotal {
    readonly pricePerPortion: number;
    readonly foodSubtotal: number;
    readonly tierId: string | null;
    readonly tierDiscount: number;
    readonly promoApplied: boolean;
    readonly promoDiscount: number;
    readonly deliveryFeePerSlot: number;
    readonly deliveryFeeTotal: number;
    readonly totalPrice: number;
}

const toMoney = (value: number) => roundHalfUp(value, MONEY_SCALE);
const floorRupiah = (value: number) => Math.floor(roundHalfUp(value, GUARD_SCALE));

function percentOf(base: number, percent: number): number {
    return floorRupiah((base * percent) / PERCENT);
}

function promoAmount(promo: PromoDiscountInput, base: number): number {
    const amount = promo.discountType === "Persen" ? percentOf(base, promo.discountValue) : promo.discountValue;
    return Math.min(floorRupiah(amount), floorRupiah(base));
}

export function foodSubtotalOf(pricePerPortion: number, slotCount: number): number {
    return toMoney(pricePerPortion * slotCount);
}

export function computeOrderTotal(input: OrderTotalInput): OrderTotal {
    const foodSubtotal = foodSubtotalOf(input.pricePerPortion, input.slotCount);
    const deliveryFeeTotal = toMoney(input.deliveryFeePerSlot * input.slotCount);
    const tierAmount = input.tier === null ? 0 : percentOf(foodSubtotal, input.tier.discountPercent);

    let tierDiscount = tierAmount;
    let promoDiscount = 0;
    let promoApplied = false;

    if (input.promo !== null) {
        if (input.promo.allowStackWithTier || input.tier === null) {
            promoDiscount = promoAmount(input.promo, foodSubtotal - tierAmount);
            promoApplied = true;
        } else {
            const alone = promoAmount(input.promo, foodSubtotal);
            if (alone > tierAmount) {
                tierDiscount = 0;
                promoDiscount = alone;
                promoApplied = true;
            }
        }
    }

    const tierId = input.tier !== null && tierDiscount > 0 ? input.tier.tierId : null;
    const totalPrice = toMoney(foodSubtotal - tierDiscount - promoDiscount + deliveryFeeTotal);

    return {
        pricePerPortion: input.pricePerPortion,
        foodSubtotal,
        tierId,
        tierDiscount,
        promoApplied,
        promoDiscount,
        deliveryFeePerSlot: input.deliveryFeePerSlot,
        deliveryFeeTotal,
        totalPrice,
    };
}

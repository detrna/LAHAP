import { describe, expect, it } from "vitest";
import { computeOrderTotal, type OrderTotalInput, type PromoDiscountInput } from "./order-total.js";

const BASE: OrderTotalInput = { pricePerPortion: 15000, slotCount: 5, deliveryFeePerSlot: 0, tier: null, promo: null };
const SILVER = { tierId: "tier-silver", discountPercent: 5 };
const percent = (value: number, allowStackWithTier = true): PromoDiscountInput => ({
    discountType: "Persen",
    discountValue: value,
    allowStackWithTier,
});
const nominal = (value: number, allowStackWithTier = true): PromoDiscountInput => ({
    discountType: "Nominal",
    discountValue: value,
    allowStackWithTier,
});

const expectInvariant = (total: ReturnType<typeof computeOrderTotal>) => {
    expect(total.totalPrice).toBe(
        total.foodSubtotal - total.tierDiscount - total.promoDiscount + total.deliveryFeeTotal,
    );
};

describe("computeOrderTotal", () => {
    it("charges slots times price with nothing else", () => {
        const total = computeOrderTotal(BASE);
        expect(total).toEqual({
            pricePerPortion: 15000,
            foodSubtotal: 75000,
            tierId: null,
            tierDiscount: 0,
            promoApplied: false,
            promoDiscount: 0,
            deliveryFeePerSlot: 0,
            deliveryFeeTotal: 0,
            totalPrice: 75000,
        });
    });

    it("adds the delivery fee per slot and never discounts it", () => {
        const total = computeOrderTotal({ ...BASE, deliveryFeePerSlot: 4000, tier: SILVER, promo: percent(100) });
        expect(total.deliveryFeeTotal).toBe(20000);
        expect(total.totalPrice).toBe(20000);
        expectInvariant(total);
    });

    it("applies the tier discount to the food subtotal", () => {
        const total = computeOrderTotal({ ...BASE, tier: SILVER });
        expect(total.tierId).toBe("tier-silver");
        expect(total.tierDiscount).toBe(3750);
        expect(total.totalPrice).toBe(71250);
    });

    it("applies a stacking promo to the subtotal after the tier discount", () => {
        const total = computeOrderTotal({ ...BASE, tier: SILVER, promo: percent(10) });
        expect(total.tierDiscount).toBe(3750);
        expect(total.promoDiscount).toBe(7125);
        expect(total.promoApplied).toBe(true);
        expect(total.totalPrice).toBe(64125);
        expectInvariant(total);
    });

    it("applies a non-stacking promo alone when it beats the tier", () => {
        const total = computeOrderTotal({ ...BASE, tier: SILVER, promo: percent(10, false) });
        expect(total).toMatchObject({ tierId: null, tierDiscount: 0, promoApplied: true, promoDiscount: 7500 });
        expectInvariant(total);
    });

    it("keeps the tier when a non-stacking promo is not larger", () => {
        const total = computeOrderTotal({ ...BASE, tier: SILVER, promo: nominal(3750, false) });
        expect(total).toMatchObject({
            tierId: "tier-silver",
            tierDiscount: 3750,
            promoApplied: false,
            promoDiscount: 0,
        });
    });

    it("applies a non-stacking promo normally without a tier", () => {
        const total = computeOrderTotal({ ...BASE, promo: nominal(5000, false) });
        expect(total).toMatchObject({ promoApplied: true, promoDiscount: 5000, totalPrice: 70000 });
    });

    it("never takes the food subtotal below zero with a nominal promo", () => {
        const total = computeOrderTotal({ ...BASE, tier: SILVER, promo: nominal(1_000_000) });
        expect(total.promoDiscount).toBe(71250);
        expect(total.totalPrice).toBe(0);
        expectInvariant(total);
    });

    it("rounds each discount down to a whole rupiah", () => {
        const total = computeOrderTotal({
            ...BASE,
            pricePerPortion: 15999,
            slotCount: 1,
            tier: { tierId: "tier-gold", discountPercent: 7.5 },
            promo: percent(12.5),
        });
        expect(total.tierDiscount).toBe(1199);
        expect(total.promoDiscount).toBe(1850);
        expect(total.totalPrice).toBe(12950);
        expectInvariant(total);
    });

    it("does not lose a rupiah to floating point", () => {
        const total = computeOrderTotal({ ...BASE, pricePerPortion: 115, slotCount: 10, promo: percent(10) });
        expect(total.promoDiscount).toBe(115);
    });

    it("leaves tierId unset when the tier gives nothing", () => {
        const total = computeOrderTotal({ ...BASE, pricePerPortion: 10, slotCount: 1, tier: SILVER });
        expect(total.tierDiscount).toBe(0);
        expect(total.tierId).toBeNull();
    });
});

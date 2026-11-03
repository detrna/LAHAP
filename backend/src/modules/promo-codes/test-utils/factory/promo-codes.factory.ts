import type { PromoCode, PromoCheck } from "../../domain/promo-code.domain.js";

export function buildPromoCode(overrides: Partial<PromoCode> = {}): PromoCode {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        code: "HEMAT20",
        discountType: "Persen",
        discountValue: 0,
        minPurchase: 0,
        allowStackWithTier: true,
        validUntil: "2026-11-03T00:00:00.000Z",
        quota: 0,
        isActive: true,
        createdAt: "2026-11-03T00:00:00.000Z",
        updatedAt: "2026-11-03T00:00:00.000Z",
        ...overrides,
    };
}

export function buildPromoCheck(overrides: Partial<PromoCheck> = {}): PromoCheck {
    return { code: "test code", applied: false, reason: null, ...overrides };
}

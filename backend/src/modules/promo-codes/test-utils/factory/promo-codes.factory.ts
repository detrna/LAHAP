import type { PromoCheck, PromoCode } from "../../domain/promo-code.domain.js";
import type { PromoCodeRecord } from "../../service/interfaces/promo-codes.repository.js";

export function buildPromoCode(overrides: Partial<PromoCode> = {}): PromoCode {
    return {
        id: "00000000-0000-4000-8000-000000000001",
        code: "HEMAT20",
        discountType: "Persen",
        discountValue: 20,
        minPurchase: 0,
        allowStackWithTier: true,
        validUntil: "2026-11-03T00:00:00.000+07:00",
        quota: 100,
        usedCount: 0,
        isActive: true,
        createdAt: "2026-11-03T00:00:00.000+07:00",
        updatedAt: "2026-11-03T00:00:00.000+07:00",
        ...overrides,
    };
}

export function buildPromoCheck(overrides: Partial<PromoCheck> = {}): PromoCheck {
    return { code: "test code", applied: false, reason: null, ...overrides };
}

export function buildPromoCodeRecord(overrides: Partial<PromoCodeRecord> = {}): PromoCodeRecord {
    return {
        id: "00000000-0000-4000-8000-000000000002",
        code: "HEMAT20",
        discountType: "Persen",
        discountValue: 20,
        minPurchase: 0,
        allowStackWithTier: true,
        validUntil: Temporal.PlainDateTime.from("2026-12-01T00:00:00"),
        quota: 100,
        isActive: true,
        createdAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        ...overrides,
    };
}

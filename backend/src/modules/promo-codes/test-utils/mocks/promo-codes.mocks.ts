import { vi } from "vitest";
import type { PromoCodesRepository } from "../../service/interfaces/promo-codes.repository.js";
import type { PromoUsage } from "../../service/interfaces/promo-usage.js";
import type { PromoCodesService } from "../../service/promo-codes.service.js";

export type Mocked<T> = { [K in keyof T]: T[K] & ReturnType<typeof vi.fn> };

export type MockedPromoCodesService = Mocked<
    Pick<
        PromoCodesService,
        "listPromoCodes" | "getPromoCode" | "createPromoCode" | "updatePromoCode" | "deletePromoCode"
    >
>;

export function createMockPromoCodesRepository(): Mocked<PromoCodesRepository> {
    return {
        listPromoCodes: vi.fn(async () => ({ items: [], total: 0 })),
        findPromoCodeById: vi.fn(async () => null),
        findPromoCodeByCode: vi.fn(async () => null),
        createPromoCode: vi.fn(),
        updatePromoCode: vi.fn(async () => null),
        deletePromoCode: vi.fn(async () => false),
    } as unknown as Mocked<PromoCodesRepository>;
}

export function createMockPromoUsage(): Mocked<PromoUsage> {
    return {
        countPromoUses: vi.fn(async () => new Map()),
        countPromoUsesByUser: vi.fn(async () => 0),
        hasPendingSubscriptions: vi.fn(async () => false),
    } as Mocked<PromoUsage>;
}

export function createMockPromoCodesService(): MockedPromoCodesService {
    return {
        listPromoCodes: vi.fn(),
        getPromoCode: vi.fn(),
        createPromoCode: vi.fn(),
        updatePromoCode: vi.fn(),
        deletePromoCode: vi.fn(),
    } as MockedPromoCodesService;
}

import type { DiscountType } from "../../domain/promo-code.domain.js";

export * from "../../domain/errors.js";

export interface PromoCodeRecord {
    readonly id: string;
    readonly code: string;
    readonly discountType: DiscountType;
    readonly discountValue: number;
    readonly minPurchase: number;
    readonly allowStackWithTier: boolean;
    readonly validUntil: Temporal.PlainDateTime;
    readonly quota: number;
    readonly isActive: boolean;
    readonly createdAt: Temporal.PlainDateTime;
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface NewPromoCodeRecord {
    readonly code: string;
    readonly discountType: DiscountType;
    readonly discountValue: number;
    readonly minPurchase: number;
    readonly allowStackWithTier: boolean;
    readonly validUntil: Temporal.PlainDateTime;
    readonly quota: number;
    readonly isActive: boolean;
}

export interface PromoCodeChanges {
    readonly code?: string | undefined;
    readonly discountType?: DiscountType | undefined;
    readonly discountValue?: number | undefined;
    readonly minPurchase?: number | undefined;
    readonly allowStackWithTier?: boolean | undefined;
    readonly validUntil?: Temporal.PlainDateTime | undefined;
    readonly quota?: number | undefined;
    readonly isActive?: boolean | undefined;
}

export interface PromoCodeListQuery {
    readonly search?: string | undefined;
    readonly isActive?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface PromoCodeListRecord {
    readonly items: readonly PromoCodeRecord[];
    readonly total: number;
}

export interface PromoCodesRepository {
    listPromoCodes(query: PromoCodeListQuery): Promise<PromoCodeListRecord>;
    findPromoCodeById(id: string): Promise<PromoCodeRecord | null>;
    findPromoCodeByCode(code: string): Promise<PromoCodeRecord | null>;
    createPromoCode(record: NewPromoCodeRecord): Promise<PromoCodeRecord>;
    updatePromoCode(id: string, changes: PromoCodeChanges): Promise<PromoCodeRecord | null>;
    deletePromoCode(id: string): Promise<boolean>;
}

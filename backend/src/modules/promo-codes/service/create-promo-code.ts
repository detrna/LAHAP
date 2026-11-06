import { assertDiscountValue, assertValidUntilInFuture } from "../domain/discount-rules.js";
import { MAX_GENERATION_ATTEMPTS, generateCode } from "../domain/generate-code.js";
import type { DiscountType, PromoCode } from "../domain/promo-code.domain.js";
import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import {
    PromoCodeAlreadyExistsError,
    PromoCodeGenerationError,
    type PromoCodeRecord,
} from "./interfaces/promo-codes.repository.js";
import type { PromoCodesService } from "./promo-codes.service.js";

export const DEFAULT_VALIDITY_DAYS = 14;

export interface CreatePromoCodeInput {
    readonly code?: string | undefined;
    readonly discountType: DiscountType;
    readonly discountValue: number;
    readonly minPurchase?: number | undefined;
    readonly allowStackWithTier?: boolean | undefined;
    readonly validUntil?: Temporal.PlainDateTime | undefined;
    readonly quota: number;
    readonly isActive?: boolean | undefined;
}

export async function createPromoCode(this: PromoCodesService, input: CreatePromoCodeInput): Promise<PromoCode> {
    assertDiscountValue(input.discountType, input.discountValue);

    const now = this.clock.now();
    if (input.validUntil !== undefined) assertValidUntilInFuture(input.validUntil, toDbTimestamp(now));

    const fields = {
        discountType: input.discountType,
        discountValue: input.discountValue,
        minPurchase: input.minPurchase ?? 0,
        allowStackWithTier: input.allowStackWithTier ?? true,
        validUntil: input.validUntil ?? toDbTimestamp(now.add({ days: DEFAULT_VALIDITY_DAYS })),
        quota: input.quota,
        isActive: input.isActive ?? true,
    };

    if (input.code !== undefined) {
        return this.presentPromoCode(await this.promoCodesRepository.createPromoCode({ code: input.code, ...fields }));
    }

    let created: PromoCodeRecord | null = null;
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS && created === null; attempt++) {
        try {
            created = await this.promoCodesRepository.createPromoCode({
                code: generateCode(this.randomInt),
                ...fields,
            });
        } catch (error) {
            if (!(error instanceof PromoCodeAlreadyExistsError)) throw error;
        }
    }
    if (created === null) throw new PromoCodeGenerationError(MAX_GENERATION_ATTEMPTS);
    return this.presentPromoCode(created);
}

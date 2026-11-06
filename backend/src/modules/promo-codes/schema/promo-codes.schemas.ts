import { z } from "zod";
import { paginationQuerySchema } from "../../../shared/pagination/index.js";
import { decimalSchema } from "../../../shared/schema/decimal.js";
import { queryBooleanSchema } from "../../../shared/schema/query-boolean.js";
import { searchQuerySchema } from "../../../shared/schema/search.js";
import { isoTimestampSchema } from "../../../shared/time/schemas.js";
import { CODE_PATTERN, normalizeCode } from "../domain/code-format.js";
import { DISCOUNT_TYPES } from "../domain/promo-code.domain.js";

export const MAX_MONEY = 9999999999.99;
export const MAX_QUOTA = 2147483647;

export const promoCodeIdParamsSchema = z.object({
    id: z.uuid(),
});

const promoCodeShape = {
    code: z
        .string()
        .transform(normalizeCode)
        .pipe(z.string().regex(CODE_PATTERN, "must be 1-50 characters: A-Z, 0-9, - or _")),
    discountType: z.enum(DISCOUNT_TYPES),
    discountValue: decimalSchema({ scale: 2, exclusiveMin: true, min: 0, max: MAX_MONEY }),
    minPurchase: decimalSchema({ scale: 2, min: 0, max: MAX_MONEY }),
    allowStackWithTier: z.boolean(),
    validUntil: isoTimestampSchema,
    quota: z.number().int().min(0).max(MAX_QUOTA),
    isActive: z.boolean(),
};

export const promoCodeCreateSchema = z.object({
    discountType: promoCodeShape.discountType,
    discountValue: promoCodeShape.discountValue,
    quota: promoCodeShape.quota,
    code: promoCodeShape.code.optional(),
    minPurchase: promoCodeShape.minPurchase.optional(),
    allowStackWithTier: promoCodeShape.allowStackWithTier.optional(),
    validUntil: promoCodeShape.validUntil.optional(),
    isActive: promoCodeShape.isActive.optional(),
});

export const promoCodeUpdateSchema = z
    .object({
        code: promoCodeShape.code.optional(),
        discountType: promoCodeShape.discountType.optional(),
        discountValue: promoCodeShape.discountValue.optional(),
        minPurchase: promoCodeShape.minPurchase.optional(),
        allowStackWithTier: promoCodeShape.allowStackWithTier.optional(),
        validUntil: promoCodeShape.validUntil.optional(),
        quota: promoCodeShape.quota.optional(),
        isActive: promoCodeShape.isActive.optional(),
    })
    .refine(value => Object.values(value).some(field => field !== undefined), {
        path: [],
        message: "must change at least one field",
    });

export const promoCodeListQuerySchema = paginationQuerySchema.extend({
    search: searchQuerySchema,
    isActive: queryBooleanSchema.optional(),
});

export type PromoCodeIdParams = z.output<typeof promoCodeIdParamsSchema>;
export type PromoCodeCreateBody = z.output<typeof promoCodeCreateSchema>;
export type PromoCodeUpdateBody = z.output<typeof promoCodeUpdateSchema>;
export type PromoCodeListQuery = z.output<typeof promoCodeListQuerySchema>;

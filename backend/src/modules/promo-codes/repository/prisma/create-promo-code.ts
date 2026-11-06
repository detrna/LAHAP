import { toNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import type { NewPromoCodeRecord, PromoCodeRecord } from "../../service/interfaces/promo-codes.repository.js";
import {
    PromoCodeAlreadyExistsError,
    PromoCodesRepositoryFailureError,
} from "../../service/interfaces/promo-codes.repository.js";
import { isCodeConflict } from "./is-code-conflict.js";
import type { PrismaPromoCodesRepository } from "./promo-codes-repository.js";
import { toPromoCodeRecord } from "./to-promo-code-record.js";

export async function createPromoCode(
    this: PrismaPromoCodesRepository,
    record: NewPromoCodeRecord,
): Promise<PromoCodeRecord> {
    try {
        const row = await this.orm.public.PromoCode.create({
            code: record.code,
            discountType: record.discountType,
            discountValue: toNumeric(record.discountValue, 2),
            minPurchase: toNumeric(record.minPurchase, 2),
            allowStackWithTier: record.allowStackWithTier,
            validUntil: record.validUntil,
            quota: record.quota,
            isActive: record.isActive,
        });
        return toPromoCodeRecord(row);
    } catch (cause) {
        if (isCodeConflict(cause)) throw new PromoCodeAlreadyExistsError({ cause });
        throw new PromoCodesRepositoryFailureError("createPromoCode", cause);
    }
}

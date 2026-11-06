import { toNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import type { PromoCodeChanges, PromoCodeRecord } from "../../service/interfaces/promo-codes.repository.js";
import {
    PromoCodeAlreadyExistsError,
    PromoCodesRepositoryFailureError,
} from "../../service/interfaces/promo-codes.repository.js";
import { isCodeConflict } from "./is-code-conflict.js";
import type { PrismaPromoCodesRepository } from "./promo-codes-repository.js";
import { toPromoCodeRecord } from "./to-promo-code-record.js";

function toPromoCodeColumns(changes: PromoCodeChanges) {
    return {
        ...(changes.code !== undefined ? { code: changes.code } : {}),
        ...(changes.discountType !== undefined ? { discountType: changes.discountType } : {}),
        ...(changes.discountValue !== undefined ? { discountValue: toNumeric(changes.discountValue, 2) } : {}),
        ...(changes.minPurchase !== undefined ? { minPurchase: toNumeric(changes.minPurchase, 2) } : {}),
        ...(changes.allowStackWithTier !== undefined ? { allowStackWithTier: changes.allowStackWithTier } : {}),
        ...(changes.validUntil !== undefined ? { validUntil: changes.validUntil } : {}),
        ...(changes.quota !== undefined ? { quota: changes.quota } : {}),
        ...(changes.isActive !== undefined ? { isActive: changes.isActive } : {}),
    };
}

export async function updatePromoCode(
    this: PrismaPromoCodesRepository,
    id: string,
    changes: PromoCodeChanges,
): Promise<PromoCodeRecord | null> {
    try {
        const columns = toPromoCodeColumns(changes);
        const target = this.orm.public.PromoCode.where({ id });
        const row = Object.keys(columns).length > 0 ? await target.update(columns) : await target.first();
        return row === null ? null : toPromoCodeRecord(row);
    } catch (cause) {
        if (isCodeConflict(cause)) throw new PromoCodeAlreadyExistsError({ cause });
        throw new PromoCodesRepositoryFailureError("updatePromoCode", cause);
    }
}

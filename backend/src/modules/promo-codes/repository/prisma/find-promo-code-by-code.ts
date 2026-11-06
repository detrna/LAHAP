import type { PromoCodeRecord } from "../../service/interfaces/promo-codes.repository.js";
import { PromoCodesRepositoryFailureError } from "../../service/interfaces/promo-codes.repository.js";
import type { PrismaPromoCodesRepository } from "./promo-codes-repository.js";
import { toPromoCodeRecord } from "./to-promo-code-record.js";

export async function findPromoCodeByCode(
    this: PrismaPromoCodesRepository,
    code: string,
): Promise<PromoCodeRecord | null> {
    try {
        const row = await this.orm.public.PromoCode.where({ code }).first();
        return row === null ? null : toPromoCodeRecord(row);
    } catch (cause) {
        throw new PromoCodesRepositoryFailureError("findPromoCodeByCode", cause);
    }
}

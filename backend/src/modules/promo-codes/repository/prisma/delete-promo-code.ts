import { PromoCodesRepositoryFailureError } from "../../service/interfaces/promo-codes.repository.js";
import type { PrismaPromoCodesRepository } from "./promo-codes-repository.js";

export async function deletePromoCode(this: PrismaPromoCodesRepository, id: string): Promise<boolean> {
    try {
        const deleted = await this.orm.public.PromoCode.where({ id }).deleteAndCount();
        return deleted > 0;
    } catch (cause) {
        throw new PromoCodesRepositoryFailureError("deletePromoCode", cause);
    }
}

import type { PromoCode } from "../domain/promo-code.domain.js";
import type { PromoCodesService } from "./promo-codes.service.js";

export interface ListPromoCodesInput {
    readonly search?: string | undefined;
    readonly isActive?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface PromoCodePage {
    readonly items: readonly PromoCode[];
    readonly total: number;
}

export async function listPromoCodes(this: PromoCodesService, input: ListPromoCodesInput): Promise<PromoCodePage> {
    const { items, total } = await this.promoCodesRepository.listPromoCodes(input);
    return { items: await this.presentPromoCodes(items), total };
}

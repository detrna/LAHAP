import type { Clock } from "../../../shared/ports/clock/clock.js";
import type { RandomInt } from "../domain/generate-code.js";
import { checkPromo } from "./check-promo.js";
import { createPromoCode } from "./create-promo-code.js";
import { deletePromoCode } from "./delete-promo-code.js";
import { findActiveCode } from "./find-active-code.js";
import { getPromoCode } from "./get-promo-code.js";
import type { PromoCodesRepository } from "./interfaces/promo-codes.repository.js";
import type { PromoUsage } from "./interfaces/promo-usage.js";
import { listPromoCodes } from "./list-promo-codes.js";
import { presentPromoCode, presentPromoCodes } from "./present-promo-codes.js";
import { updatePromoCode } from "./update-promo-code.js";

export class PromoCodesService {
    constructor(
        readonly promoCodesRepository: PromoCodesRepository,
        readonly clock: Clock,
        readonly randomInt: RandomInt,
        readonly promoUsage: PromoUsage,
    ) {}

    presentPromoCodes = presentPromoCodes;
    presentPromoCode = presentPromoCode;
    listPromoCodes = listPromoCodes;
    getPromoCode = getPromoCode;
    createPromoCode = createPromoCode;
    updatePromoCode = updatePromoCode;
    deletePromoCode = deletePromoCode;
    findActiveCode = findActiveCode;
    checkPromo = checkPromo;
}

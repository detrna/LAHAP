import type { PromoCodesService } from "../service/promo-codes.service.js";
import { createPromoCode } from "./create-promo-code.js";
import { deletePromoCode } from "./delete-promo-code.js";
import { getPromoCode } from "./get-promo-code.js";
import { listPromoCodes } from "./list-promo-codes.js";
import { updatePromoCode } from "./update-promo-code.js";

export class PromoCodesController {
    constructor(readonly promoCodesService: PromoCodesService) {}

    listPromoCodes = listPromoCodes.bind(this);
    getPromoCode = getPromoCode.bind(this);
    createPromoCode = createPromoCode.bind(this);
    updatePromoCode = updatePromoCode.bind(this);
    deletePromoCode = deletePromoCode.bind(this);
}

import type { PromoCodesService } from "../service/promo-codes.service.js";

export class PromoCodesController {
    constructor(readonly promoCodesService: PromoCodesService) {}
}

import type { PromoCodesRepository } from "./interfaces/promo-codes.repository.js";

export class PromoCodesService {
    constructor(readonly promoCodesRepository: PromoCodesRepository) {}
}

import type { PromoCheckResult } from "../../../promo-codes/domain/promo-check.js";

export interface PromoCheckRequest {
    readonly code: string;
    readonly userId: string;
    readonly foodSubtotal: number;
}

export interface PromoChecker {
    checkPromo(request: PromoCheckRequest): Promise<PromoCheckResult>;
}

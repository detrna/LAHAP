import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { isValidCode, normalizeCode } from "../domain/code-format.js";
import { evaluatePromo, type PromoCheckResult } from "../domain/promo-check.js";
import type { PromoCodesService } from "./promo-codes.service.js";

export interface PromoCheckInput {
    readonly code: string;
    readonly userId: string;
    readonly foodSubtotal?: number | undefined;
}

export async function checkPromo(this: PromoCodesService, input: PromoCheckInput): Promise<PromoCheckResult> {
    const code = normalizeCode(input.code);
    if (!isValidCode(code)) return { valid: false, code, reason: "NOT_FOUND" };

    const record = await this.promoCodesRepository.findPromoCodeByCode(code);
    if (record === null) return { valid: false, code, reason: "NOT_FOUND" };

    const [uses, userUseCount] = await Promise.all([
        this.promoUsage.countPromoUses([record.id]),
        this.promoUsage.countPromoUsesByUser(record.id, input.userId),
    ]);
    return evaluatePromo(record, {
        usedCount: uses.get(record.id) ?? 0,
        userUseCount,
        ...(input.foodSubtotal !== undefined ? { foodSubtotal: input.foodSubtotal } : {}),
        now: toDbTimestamp(this.clock.now()),
    });
}

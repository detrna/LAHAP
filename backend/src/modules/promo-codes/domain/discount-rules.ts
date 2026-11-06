import { ValidationError } from "../../../shared/errors/validation-error.js";
import type { DiscountType } from "./promo-code.domain.js";

export const MAX_PERCENT = 100;

export function assertDiscountValue(discountType: DiscountType, discountValue: number): void {
    if (discountValue <= 0) {
        throw new ValidationError([
            { target: "body", path: "discountValue", message: "must be greater than 0", code: "too_small" },
        ]);
    }
    if (discountType === "Persen" && discountValue > MAX_PERCENT) {
        throw new ValidationError([
            {
                target: "body",
                path: "discountValue",
                message: `must be at most ${MAX_PERCENT} for a percent discount`,
                code: "too_big",
            },
        ]);
    }
}

export function assertValidUntilInFuture(validUntil: Temporal.PlainDateTime, now: Temporal.PlainDateTime): void {
    if (Temporal.PlainDateTime.compare(validUntil, now) <= 0) {
        throw new ValidationError([
            { target: "body", path: "validUntil", message: "must be in the future", code: "too_small" },
        ]);
    }
}

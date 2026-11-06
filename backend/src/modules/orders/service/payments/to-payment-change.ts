import type { PaymentOutcome } from "../../domain/payment-event.js";
import type { PaymentMethod } from "../../domain/payment.domain.js";
import type { PaymentChange } from "../interfaces/orders.repository.js";

export interface PaidDetails {
    readonly paidAt: Temporal.PlainDateTime;
    readonly transactionId: string | null;
    readonly method: PaymentMethod;
}

export function toPaymentChange(outcome: PaymentOutcome, paid: PaidDetails): PaymentChange | null {
    switch (outcome.kind) {
        case "none":
            return null;
        case "paid":
            return { payment: { status: "Success", ...paid }, subscription: { status: "Success" } };
        case "late-paid":
            return { payment: { status: "Success", ...paid }, subscription: { needsRefund: true } };
        case "expired":
            return {
                payment: { status: "Expire" },
                ...(outcome.expiresSubscription ? { subscription: { status: "Expire" } } : {}),
            };
        case "refunded":
            return {
                payment: { status: "Refund" },
                subscription: { needsRefund: false, ...(outcome.cancelsSubscription ? { status: "Dibatalkan" } : {}) },
            };
    }
}

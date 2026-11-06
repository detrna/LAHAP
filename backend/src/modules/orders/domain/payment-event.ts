import type { PaymentStatus } from "./payment.domain.js";
import type { SubscriptionStatus } from "./subscription.domain.js";

export interface PaymentState {
    readonly paymentStatus: PaymentStatus;
    readonly subscriptionStatus: SubscriptionStatus;
}

export type PaymentOutcome =
    | { readonly kind: "none" }
    | { readonly kind: "paid" }
    | { readonly kind: "late-paid" }
    | { readonly kind: "expired"; readonly expiresSubscription: boolean }
    | { readonly kind: "refunded"; readonly cancelsSubscription: boolean };

const NONE: PaymentOutcome = { kind: "none" };
const CLOSED_SUBSCRIPTIONS: readonly SubscriptionStatus[] = ["Expire", "Dibatalkan"];

function decidePaid(state: PaymentState): PaymentOutcome {
    if (state.paymentStatus === "Pending" && state.subscriptionStatus === "Pending") return { kind: "paid" };
    const paymentOpen = state.paymentStatus === "Pending" || state.paymentStatus === "Expire";
    if (paymentOpen && CLOSED_SUBSCRIPTIONS.includes(state.subscriptionStatus)) return { kind: "late-paid" };
    return NONE;
}

export function decidePaymentOutcome(state: PaymentState, target: PaymentStatus): PaymentOutcome {
    switch (target) {
        case "Success":
            return decidePaid(state);
        case "Expire":
            if (state.paymentStatus !== "Pending") return NONE;
            return { kind: "expired", expiresSubscription: state.subscriptionStatus === "Pending" };
        case "Refund":
            if (state.paymentStatus !== "Success") return NONE;
            return { kind: "refunded", cancelsSubscription: state.subscriptionStatus === "Success" };
        case "Pending":
            return NONE;
    }
}

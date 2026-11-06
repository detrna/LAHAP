import { describe, expect, it } from "vitest";
import { decidePaymentOutcome, type PaymentOutcome, type PaymentState } from "./payment-event.js";
import type { PaymentStatus } from "./payment.domain.js";

const cases: readonly [PaymentState, PaymentStatus, PaymentOutcome][] = [
    [{ paymentStatus: "Pending", subscriptionStatus: "Pending" }, "Success", { kind: "paid" }],
    [{ paymentStatus: "Success", subscriptionStatus: "Success" }, "Success", { kind: "none" }],
    [{ paymentStatus: "Expire", subscriptionStatus: "Expire" }, "Success", { kind: "late-paid" }],
    [{ paymentStatus: "Expire", subscriptionStatus: "Dibatalkan" }, "Success", { kind: "late-paid" }],
    [{ paymentStatus: "Pending", subscriptionStatus: "Dibatalkan" }, "Success", { kind: "late-paid" }],
    [{ paymentStatus: "Refund", subscriptionStatus: "Dibatalkan" }, "Success", { kind: "none" }],
    [{ paymentStatus: "Pending", subscriptionStatus: "Pending" }, "Pending", { kind: "none" }],
    [
        { paymentStatus: "Pending", subscriptionStatus: "Pending" },
        "Expire",
        { kind: "expired", expiresSubscription: true },
    ],
    [
        { paymentStatus: "Pending", subscriptionStatus: "Dibatalkan" },
        "Expire",
        { kind: "expired", expiresSubscription: false },
    ],
    [{ paymentStatus: "Success", subscriptionStatus: "Success" }, "Expire", { kind: "none" }],
    [{ paymentStatus: "Expire", subscriptionStatus: "Expire" }, "Expire", { kind: "none" }],
    [
        { paymentStatus: "Success", subscriptionStatus: "Success" },
        "Refund",
        { kind: "refunded", cancelsSubscription: true },
    ],
    [
        { paymentStatus: "Success", subscriptionStatus: "Dibatalkan" },
        "Refund",
        { kind: "refunded", cancelsSubscription: false },
    ],
    [{ paymentStatus: "Refund", subscriptionStatus: "Dibatalkan" }, "Refund", { kind: "none" }],
    [{ paymentStatus: "Pending", subscriptionStatus: "Pending" }, "Refund", { kind: "none" }],
];

describe("decidePaymentOutcome", () => {
    it.each(cases)("%o with %s gives %o", (state, target, outcome) => {
        expect(decidePaymentOutcome(state, target)).toEqual(outcome);
    });
});

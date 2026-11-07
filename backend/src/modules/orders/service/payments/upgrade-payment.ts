import { decideUpgradeOutcome, isSwitchable, type UpgradeOutcome } from "../../domain/method-change.js";
import type { PaymentStatus } from "../../domain/payment.domain.js";
import type { PaymentChange, PaymentWithSubscription } from "../interfaces/orders.repository.js";
import type { PaidDetails } from "./to-payment-change.js";

export function isUpgradePayment(current: PaymentWithSubscription): boolean {
    return current.payment.type === "DELIVERY_SERVICE_UPGRADE";
}

export function decideUpgradePayment(
    current: PaymentWithSubscription,
    target: PaymentStatus,
    today: Temporal.PlainDate,
): UpgradeOutcome {
    const upgrade = current.methodChange;
    if (upgrade === undefined) return { kind: "none" };
    const { change, orders } = upgrade;
    return decideUpgradeOutcome(
        {
            paymentStatus: current.payment.status,
            changeStatus: change.status,
            subscriptionStatus: current.subscription.status,
            slotsStillSwitchable:
                orders.length === change.slots.length &&
                orders.every(order => isSwitchable(order, change.toDelivery, today)),
        },
        target,
    );
}

export function toUpgradePaymentChange(
    outcome: UpgradeOutcome,
    paid: PaidDetails | Pick<PaidDetails, "paidAt">,
): PaymentChange | null {
    switch (outcome.kind) {
        case "none":
            return null;
        case "upgrade-paid":
            return { payment: { status: "Success", ...paid }, methodChange: { status: "Success", apply: true } };
        case "upgrade-late-paid":
            return { payment: { status: "Success", ...paid }, methodChange: { status: "Expire", needsRefund: true } };
        case "upgrade-expired":
            return { payment: { status: "Expire" }, methodChange: { status: "Expire" } };
        case "upgrade-refunded":
            return { payment: { status: "Refund" }, methodChange: { needsRefund: false } };
    }
}

export function hasOtherPaidPayments(current: PaymentWithSubscription): boolean {
    return (current.otherPayments ?? []).some(payment => payment.status === "Success");
}

import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import { decidePaymentOutcome, type PaymentOutcome } from "../../domain/payment-event.js";
import { toPaidMethod, toStoredPaymentStatus } from "../../domain/payment-status.js";
import type { OrdersService } from "../orders.service.js";
import { toPaymentChange } from "./to-payment-change.js";

export async function handleMidtransNotification(this: OrdersService, payload: unknown): Promise<void> {
    const notification = this.paymentGateway.verifyNotification(payload);
    const context = { orderId: notification.orderId, status: notification.rawStatus };
    if (notification.status === "CHALLENGE") this.logger.warn(context, "midtrans flagged a payment for review");

    const target = toStoredPaymentStatus(notification.status);
    const paid = {
        paidAt: toDbTimestamp(this.clock.now()),
        transactionId: notification.transactionId ?? null,
        method: toPaidMethod(notification.paymentType),
    };
    let outcome = { kind: "none" } as PaymentOutcome;
    let amountMismatch = false;

    const result = await this.ordersRepository.changePayment(notification.orderId, current => {
        if (current.payment.amount !== notification.grossAmount) {
            amountMismatch = true;
            return null;
        }
        outcome = decidePaymentOutcome(
            { paymentStatus: current.payment.status, subscriptionStatus: current.subscription.status },
            target,
        );
        return toPaymentChange(outcome, paid);
    });

    if (result === null) {
        this.logger.warn(context, "midtrans notification for an unknown payment was ignored");
        return;
    }
    if (amountMismatch) {
        this.logger.error(
            { ...context, expected: result.before.payment.amount, received: notification.grossAmount },
            "midtrans notification amount does not match the payment, ignored",
        );
        return;
    }
    if (result.after !== null) await this.applyPaymentEffects(outcome, result.after);
}

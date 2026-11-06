import type { PaymentOutcome } from "../../domain/payment-event.js";
import type { PaymentWithSubscription } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function applyPaymentEffects(
    this: OrdersService,
    outcome: PaymentOutcome,
    after: PaymentWithSubscription,
): Promise<void> {
    const { subscription } = after;
    switch (outcome.kind) {
        case "paid":
            await this.afterSubscriptionPaid(subscription);
            return;
        case "late-paid":
            await this.notifier
                .notifyAdmins({
                    title: "Pembayaran masuk setelah pesanan ditutup",
                    body: `Pembayaran ${after.payment.id} diterima saat pesanan berstatus ${subscription.status}. Kembalikan dananya secara manual, lalu konfirmasi refund.`,
                })
                .catch((err: unknown) => {
                    this.logger.warn({ err, paymentId: after.payment.id }, "late payment notification failed");
                });
            return;
        case "refunded":
            if (!outcome.cancelsSubscription) return;
            await this.afterSubscriptionCancelled(
                subscription,
                "Pesananmu dibatalkan karena pembayarannya dikembalikan.",
            );
            return;
        case "expired":
        case "none":
            return;
    }
}

import type { UpgradeOutcome } from "../../domain/method-change.js";
import type { PaymentOutcome } from "../../domain/payment-event.js";
import type { PaymentWithSubscription } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function applyPaymentEffects(
    this: OrdersService,
    outcome: PaymentOutcome | UpgradeOutcome,
    after: PaymentWithSubscription,
): Promise<void> {
    const { subscription } = after;
    const change = after.methodChange?.change;
    switch (outcome.kind) {
        case "upgrade-paid":
            if (change !== undefined) await this.afterMethodChanged(change, subscription, []);
            return;
        case "upgrade-late-paid":
            if (change !== undefined) await this.afterUpgradeNotApplied(change);
            return;
        case "upgrade-refunded":
            if (change !== undefined) await this.afterUpgradeRefunded(change);
            return;
        case "upgrade-expired":
            return;
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

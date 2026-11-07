import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import type { Payment } from "../../domain/payment.domain.js";
import { PaymentNotFoundError } from "../interfaces/orders.repository.js";
import { decideUpgradePayment, isUpgradePayment, toUpgradePaymentChange } from "./upgrade-payment.js";
import type { OrdersService } from "../orders.service.js";
import { toPayment } from "../present.js";

export async function verifyCashPayment(this: OrdersService, paymentId: string): Promise<Payment> {
    const now = this.clock.now();
    const paidAt = toDbTimestamp(now);
    const result = await this.ordersRepository.changePayment(paymentId, current => {
        const { payment, subscription } = current;
        if (payment.method !== "CASH" || payment.status !== "Pending") {
            throw new InvalidStateError("payment is not a pending cash payment");
        }
        if (isUpgradePayment(current)) {
            const outcome = decideUpgradePayment(current, "Success", now.toPlainDate());
            if (outcome.kind !== "upgrade-paid") {
                throw new InvalidStateError("delivery method change can no longer be applied");
            }
            return toUpgradePaymentChange(outcome, { paidAt });
        }
        if (subscription.status !== "Pending") throw new InvalidStateError("subscription is not waiting for payment");
        return { payment: { status: "Success", paidAt }, subscription: { status: "Success" } };
    });
    if (result === null || result.after === null) throw new PaymentNotFoundError();

    const upgrade = result.after.methodChange?.change;
    if (upgrade !== undefined) {
        await this.afterMethodChanged(upgrade, result.after.subscription, []);
    } else {
        await this.afterSubscriptionPaid(result.after.subscription);
    }
    return toPayment(result.after.payment);
}

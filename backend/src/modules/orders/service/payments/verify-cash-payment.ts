import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import { toDbTimestamp } from "../../../../shared/time/timestamp.js";
import type { Payment } from "../../domain/payment.domain.js";
import { PaymentNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toPayment } from "../present.js";

export async function verifyCashPayment(this: OrdersService, paymentId: string): Promise<Payment> {
    const paidAt = toDbTimestamp(this.clock.now());
    const result = await this.ordersRepository.changePayment(paymentId, ({ payment, subscription }) => {
        if (payment.method !== "CASH" || payment.status !== "Pending") {
            throw new InvalidStateError("payment is not a pending cash payment");
        }
        if (subscription.status !== "Pending") throw new InvalidStateError("subscription is not waiting for payment");
        return { payment: { status: "Success", paidAt }, subscription: { status: "Success" } };
    });
    if (result === null || result.after === null) throw new PaymentNotFoundError();

    await this.afterSubscriptionPaid(result.after.subscription);
    return toPayment(result.after.payment);
}

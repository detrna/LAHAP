import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { Payment } from "../../domain/payment.domain.js";
import { PaymentNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toPayment } from "../present.js";

export async function confirmRefund(this: OrdersService, paymentId: string): Promise<Payment> {
    const result = await this.ordersRepository.changePayment(paymentId, ({ payment, subscription }) => {
        if (!subscription.needsRefund) throw new InvalidStateError("subscription does not need a refund");
        if (payment.status !== "Success") throw new InvalidStateError("payment has not been paid");
        return { payment: { status: "Refund" }, subscription: { needsRefund: false } };
    });
    if (result === null || result.after === null) throw new PaymentNotFoundError();
    return toPayment(result.after.payment);
}

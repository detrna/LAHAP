import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { Payment } from "../../domain/payment.domain.js";
import { PaymentNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { hasOtherPaidPayments } from "./upgrade-payment.js";
import { toPayment } from "../present.js";

export async function confirmRefund(this: OrdersService, paymentId: string): Promise<Payment> {
    const result = await this.ordersRepository.changePayment(paymentId, current => {
        const { payment, subscription, methodChange } = current;
        if (!subscription.needsRefund) throw new InvalidStateError("subscription does not need a refund");
        if (payment.status !== "Success") throw new InvalidStateError("payment has not been paid");
        return {
            payment: { status: "Refund" },
            subscription: { needsRefund: hasOtherPaidPayments(current) },
            ...(methodChange !== undefined ? { methodChange: { needsRefund: false } } : {}),
        };
    });
    if (result === null || result.after === null) throw new PaymentNotFoundError();
    return toPayment(result.after.payment);
}

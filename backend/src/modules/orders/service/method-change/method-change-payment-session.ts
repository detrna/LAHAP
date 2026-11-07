import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { PaymentSession } from "../../domain/payment.domain.js";
import { DeliveryMethodChangeNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function getMethodChangePaymentSession(
    this: OrdersService,
    userId: string,
    changeId: string,
): Promise<PaymentSession> {
    const change = await this.ordersRepository.findMethodChangeById(changeId);
    const subscription =
        change === null ? null : await this.ordersRepository.findSubscriptionById(change.subscriptionId);
    if (change === null || subscription === null || subscription.userId !== userId) {
        throw new DeliveryMethodChangeNotFoundError();
    }
    if (change.status !== "Pending" || change.paymentId === null) {
        throw new InvalidStateError("delivery method change is not waiting for payment");
    }
    const payments = await this.ordersRepository.findPaymentsBySubscriptionId(change.subscriptionId);
    const payment = payments.find(candidate => candidate.id === change.paymentId);
    if (payment === undefined || payment.status !== "Pending") {
        throw new InvalidStateError("delivery method change is not waiting for payment");
    }
    if (payment.method === "CASH") throw new InvalidStateError("cash payments are paid at the cashier");

    const session = await this.readPaymentSession(payment.id);
    if (session === null) throw new InvalidStateError("payment session has expired");
    return session;
}

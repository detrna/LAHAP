import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { PaymentSession } from "../../domain/payment.domain.js";
import { SubscriptionNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

export async function getPaymentSession(
    this: OrdersService,
    userId: string,
    subscriptionId: string,
): Promise<PaymentSession> {
    const subscription = await this.ordersRepository.findSubscriptionById(subscriptionId);
    if (subscription === null || subscription.userId !== userId) throw new SubscriptionNotFoundError();
    if (subscription.status !== "Pending") throw new InvalidStateError("subscription is not waiting for payment");

    const payments = await this.ordersRepository.findPaymentsBySubscriptionId(subscriptionId);
    const payment = payments.find(candidate => candidate.status === "Pending");
    if (payment === undefined) throw new InvalidStateError("subscription is not waiting for payment");
    if (payment.method === "CASH") throw new InvalidStateError("cash orders are paid at the cashier");

    const session = await this.readPaymentSession(payment.id);
    if (session === null) throw new InvalidStateError("payment session has expired");
    return session;
}

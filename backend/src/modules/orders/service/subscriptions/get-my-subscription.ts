import type { Subscription } from "../../domain/subscription.domain.js";
import { SubscriptionNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toPayment, toSubscription } from "../present.js";

export async function getMySubscription(this: OrdersService, userId: string, id: string): Promise<Subscription> {
    const record = await this.ordersRepository.findSubscriptionById(id);
    if (record === null || record.userId !== userId) throw new SubscriptionNotFoundError();
    const [orders, payments] = await Promise.all([
        this.ordersRepository.findOrdersBySubscriptionId(id),
        this.ordersRepository.findPaymentsBySubscriptionId(id),
    ]);
    return {
        ...toSubscription(record, this.clock.now().toPlainDate()),
        orders: await this.presentOrders(orders),
        payments: payments.map(toPayment),
    };
}

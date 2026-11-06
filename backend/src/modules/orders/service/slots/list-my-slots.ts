import type { Order } from "../../domain/order.domain.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { OrdersService } from "../orders.service.js";

export async function listMySlots(
    this: OrdersService,
    userId: string,
    date: Temporal.PlainDate | undefined,
): Promise<readonly Order[]> {
    const slots = await this.ordersRepository.findCustomerSlots({
        userId,
        date: date ?? this.clock.now().toPlainDate(),
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    const orders = await this.presentOrders(slots.map(slot => slot.order));
    return [...orders].sort((a, b) =>
        (a.menuSchedule?.deliveryTime.time ?? "").localeCompare(b.menuSchedule?.deliveryTime.time ?? ""),
    );
}

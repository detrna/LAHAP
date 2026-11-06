import type { Subscription, SubscriptionStatus } from "../../domain/subscription.domain.js";
import type { Page } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toSubscription } from "../present.js";

export interface ListMySubscriptionsInput {
    readonly status?: SubscriptionStatus | undefined;
    readonly skip: number;
    readonly take: number;
}

export async function listMySubscriptions(
    this: OrdersService,
    userId: string,
    input: ListMySubscriptionsInput,
): Promise<Page<Subscription>> {
    const { items, total } = await this.ordersRepository.listSubscriptions({ userId, ...input });
    const today = this.clock.now().toPlainDate();
    return { items: items.map(record => toSubscription(record, today)), total };
}

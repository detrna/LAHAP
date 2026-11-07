import type { Subscription, SubscriptionStatus, PurchaseType } from "../../domain/subscription.domain.js";
import type { Page, SubscriptionRecord } from "../interfaces/orders.repository.js";
import { SubscriptionNotFoundError } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { toDeliveryMethodChange, toPayment, toSubscription } from "../present.js";
import { toCreatedRange, type DateFilter } from "./created-range.js";

export interface AdminSubscriptionFilter extends DateFilter {
    readonly status?: SubscriptionStatus | undefined;
    readonly userId?: string | undefined;
    readonly packageId?: string | undefined;
    readonly purchaseType?: PurchaseType | undefined;
    readonly needsRefund?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

async function withCustomers(
    service: OrdersService,
    records: readonly SubscriptionRecord[],
): Promise<readonly Subscription[]> {
    const users = await service.customers.getSummaries([...new Set(records.map(record => record.userId))]);
    const userById = new Map(users.map(user => [user.id, user]));
    const today = service.clock.now().toPlainDate();
    return records.map(record => {
        const user = userById.get(record.userId);
        return { ...toSubscription(record, today), ...(user !== undefined ? { user } : {}) };
    });
}

export async function listSubscriptionsForAdmin(
    this: OrdersService,
    filter: AdminSubscriptionFilter,
): Promise<Page<Subscription>> {
    const { from, to, ...rest } = filter;
    const { items, total } = await this.ordersRepository.listSubscriptions({
        ...rest,
        ...toCreatedRange({ from, to }),
    });
    return { items: await withCustomers(this, items), total };
}

export async function getSubscriptionForAdmin(this: OrdersService, id: string): Promise<Subscription> {
    const record = await this.ordersRepository.findSubscriptionById(id);
    if (record === null) throw new SubscriptionNotFoundError();
    const [[subscription], orders, payments, changes] = await Promise.all([
        withCustomers(this, [record]),
        this.ordersRepository.findOrdersBySubscriptionId(id),
        this.ordersRepository.findPaymentsBySubscriptionId(id),
        this.ordersRepository.findMethodChangesBySubscriptionIds([id]),
    ]);
    return {
        ...subscription!,
        orders: await this.presentOrders(orders),
        payments: payments.map(toPayment),
        deliveryMethodChanges: changes.map(toDeliveryMethodChange),
    };
}

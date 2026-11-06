import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type {
    CustomerSlotQuery,
    OrderRecord,
    SlotWithSubscription,
} from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toOrderRecord, toSubscriptionRecord } from "../to-records.js";

export async function findOrdersBySubscriptionId(
    this: PrismaOrdersRepository,
    subscriptionId: string,
): Promise<readonly OrderRecord[]> {
    try {
        const rows = await this.db.orm.public.Order.where({ subscriptionId })
            .orderBy([row => row.serviceDate.asc(), row => row.id.asc()])
            .all();
        return rows.map(toOrderRecord);
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findOrdersBySubscriptionId", cause);
    }
}

export async function findSlotWithSubscription(
    this: PrismaOrdersRepository,
    orderId: string,
): Promise<SlotWithSubscription | null> {
    try {
        const order = await this.db.orm.public.Order.where({ id: orderId }).first();
        if (order === null) return null;
        const subscription = await this.db.orm.public.Subscription.where({ id: order.subscriptionId }).first();
        if (subscription === null) return null;
        return { order: toOrderRecord(order), subscription: toSubscriptionRecord(subscription) };
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findSlotWithSubscription", cause);
    }
}

export async function findCustomerSlots(
    this: PrismaOrdersRepository,
    query: CustomerSlotQuery,
): Promise<readonly SlotWithSubscription[]> {
    try {
        let subscriptions = this.db.orm.public.Subscription.where({ userId: query.userId })
            .where(row => row.status.in([...query.subscriptionStatuses] as Varchar<30>[]))
            .where(row => row.startDate.lte(query.date))
            .where(row => row.endDate.gte(query.date));
        if (query.subscriptionId !== undefined) subscriptions = subscriptions.where({ id: query.subscriptionId });
        const subscriptionRows = await subscriptions.all();
        if (subscriptionRows.length === 0) return [];

        const byId = new Map(subscriptionRows.map(row => [row.id, toSubscriptionRecord(row)]));
        const orders = await this.db.orm.public.Order.where(row =>
            row.subscriptionId.in([...byId.keys()] as Varchar<36>[]),
        )
            .where({ serviceDate: query.date })
            .orderBy(row => row.id.asc())
            .all();
        return orders.map(row => ({ order: toOrderRecord(row), subscription: byId.get(row.subscriptionId)! }));
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findCustomerSlots", cause);
    }
}

export async function findCompletionTimes(
    this: PrismaOrdersRepository,
    orderIds: readonly string[],
): Promise<ReadonlyMap<string, Temporal.PlainDateTime>> {
    if (orderIds.length === 0) return new Map();
    try {
        const rows = await this.db.orm.public.OrderStatusHistory.where(row => row.orderId.in(orderIds as Varchar<36>[]))
            .where({ toStatus: "Selesai" })
            .select("orderId", "changedAt")
            .all();
        return new Map(rows.map(row => [row.orderId, row.changedAt]));
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findCompletionTimes", cause);
    }
}

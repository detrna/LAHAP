import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import type { SlotQuery, SlotWithSubscription } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toOrderRecord, toSubscriptionRecord } from "../to-records.js";

function matchingOrders(orm: Db["orm"], query: SlotQuery) {
    let orders = orm.public.Order;
    if (query.orderIds !== undefined) orders = orders.where(row => row.id.in([...query.orderIds!] as Varchar<36>[]));
    if (query.menuScheduleIds !== undefined) {
        orders = orders.where(row => row.menuScheduleId.in([...query.menuScheduleIds!] as Varchar<36>[]));
    }
    if (query.usesAlternativeMenu !== undefined) {
        orders = orders.where({ usesAlternativeMenu: query.usesAlternativeMenu });
    }
    if (query.courierId !== undefined) orders = orders.where({ courierId: query.courierId });
    if (query.statuses !== undefined)
        orders = orders.where(row => row.status.in([...query.statuses!] as Varchar<30>[]));
    if (query.serviceDateFrom !== undefined) orders = orders.where(row => row.serviceDate.gte(query.serviceDateFrom!));
    if (query.serviceDateTo !== undefined) orders = orders.where(row => row.serviceDate.lte(query.serviceDateTo!));
    return orders;
}

export async function findSlots(
    this: PrismaOrdersRepository,
    query: SlotQuery,
): Promise<readonly SlotWithSubscription[]> {
    if (query.orderIds?.length === 0 || query.menuScheduleIds?.length === 0) return [];
    try {
        const orders = await matchingOrders(this.db.orm, query)
            .orderBy([row => row.serviceDate.asc(), row => row.id.asc()])
            .all();
        if (orders.length === 0) return [];
        const subscriptionIds = [...new Set(orders.map(row => row.subscriptionId))];
        let matching = this.db.orm.public.Subscription.where(row => row.id.in(subscriptionIds as Varchar<36>[])).where(
            row => row.status.in([...query.subscriptionStatuses] as Varchar<30>[]),
        );
        if (query.isDelivery !== undefined) matching = matching.where({ isDelivery: query.isDelivery });
        const subscriptions = await matching.all();
        const byId = new Map(subscriptions.map(row => [row.id, toSubscriptionRecord(row)]));
        return orders.flatMap(row => {
            const subscription = byId.get(row.subscriptionId);
            return subscription === undefined ? [] : [{ order: toOrderRecord(row), subscription }];
        });
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findSlots", cause);
    }
}

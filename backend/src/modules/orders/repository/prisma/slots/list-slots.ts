import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import type {
    Page,
    SlotListQuery,
    SlotWithSubscription,
    StatusHistoryRecord,
} from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { OrderStatus } from "../../../domain/order.domain.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toOrderRecord, toSubscriptionRecord } from "../to-records.js";

function matchingSubscriptions(orm: Db["orm"], query: SlotListQuery) {
    let subscriptions = orm.public.Subscription.where(row =>
        row.status.in([...query.subscriptionStatuses] as Varchar<30>[]),
    )
        .where(row => row.startDate.lte(query.date))
        .where(row => row.endDate.gte(query.date));
    if (query.packageId !== undefined) subscriptions = subscriptions.where({ packageId: query.packageId });
    if (query.subscriptionId !== undefined) subscriptions = subscriptions.where({ id: query.subscriptionId });
    return subscriptions;
}

function matchingOrders(orm: Db["orm"], query: SlotListQuery, subscriptionIds: readonly string[]) {
    let orders = orm.public.Order.where(row => row.subscriptionId.in([...subscriptionIds] as Varchar<36>[])).where({
        serviceDate: query.date,
    });
    if (query.menuScheduleIds !== undefined) {
        orders = orders.where(row => row.menuScheduleId.in([...query.menuScheduleIds!] as Varchar<36>[]));
    }
    if (query.status !== undefined) orders = orders.where({ status: query.status });
    if (query.isDelivery !== undefined) orders = orders.where({ isDelivery: query.isDelivery });
    if (query.courierId !== undefined) orders = orders.where({ courierId: query.courierId });
    if (query.unassigned === true) orders = orders.where({ courierId: null });
    if (query.unassigned === false) orders = orders.where(row => row.courierId.isNotNull());
    return orders;
}

export async function listSlots(
    this: PrismaOrdersRepository,
    query: SlotListQuery,
): Promise<Page<SlotWithSubscription>> {
    if (query.menuScheduleIds?.length === 0) return { items: [], total: 0 };
    try {
        const subscriptions = await matchingSubscriptions(this.db.orm, query).all();
        if (subscriptions.length === 0) return { items: [], total: 0 };
        const byId = new Map(subscriptions.map(row => [row.id, toSubscriptionRecord(row)]));
        const ids = [...byId.keys()];
        const [rows, totals] = await Promise.all([
            matchingOrders(this.db.orm, query, ids)
                .orderBy([row => row.menuScheduleId.asc(), row => row.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matchingOrders(this.db.orm, query, ids).aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return {
            items: rows.map(row => ({ order: toOrderRecord(row), subscription: byId.get(row.subscriptionId)! })),
            total: totals.total,
        };
    } catch (cause) {
        throw new OrdersRepositoryFailureError("listSlots", cause);
    }
}

export async function findStatusHistory(
    this: PrismaOrdersRepository,
    orderId: string,
): Promise<readonly StatusHistoryRecord[]> {
    try {
        const rows = await this.db.orm.public.OrderStatusHistory.where({ orderId })
            .orderBy([row => row.changedAt.asc(), row => row.id.asc()])
            .all();
        return rows.map(row => ({
            id: row.id,
            orderId: row.orderId,
            fromStatus: row.fromStatus as OrderStatus | null,
            toStatus: row.toStatus as OrderStatus,
            changedById: row.changedById,
            adminNote: row.adminNote,
            changedAt: row.changedAt,
        }));
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findStatusHistory", cause);
    }
}

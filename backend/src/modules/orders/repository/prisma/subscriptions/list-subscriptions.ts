import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import type { Page, SubscriptionListQuery, SubscriptionRecord } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toSubscriptionRecord } from "../to-records.js";

function matching(orm: Db["orm"], query: SubscriptionListQuery) {
    let subscriptions = orm.public.Subscription;
    if (query.userId !== undefined) subscriptions = subscriptions.where({ userId: query.userId });
    if (query.status !== undefined) subscriptions = subscriptions.where({ status: query.status });
    if (query.packageId !== undefined) subscriptions = subscriptions.where({ packageId: query.packageId });
    if (query.purchaseType !== undefined) subscriptions = subscriptions.where({ purchaseType: query.purchaseType });
    if (query.needsRefund !== undefined) subscriptions = subscriptions.where({ needsRefund: query.needsRefund });
    if (query.createdFrom !== undefined) {
        subscriptions = subscriptions.where(row => row.createdAt.gte(query.createdFrom!));
    }
    if (query.createdBefore !== undefined) {
        subscriptions = subscriptions.where(row => row.createdAt.lt(query.createdBefore!));
    }
    return subscriptions;
}

export async function listSubscriptions(
    this: PrismaOrdersRepository,
    query: SubscriptionListQuery,
): Promise<Page<SubscriptionRecord>> {
    try {
        const [rows, totals] = await Promise.all([
            matching(this.db.orm, query)
                .orderBy([row => row.createdAt.desc(), row => row.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matching(this.db.orm, query).aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toSubscriptionRecord), total: totals.total };
    } catch (cause) {
        throw new OrdersRepositoryFailureError("listSubscriptions", cause);
    }
}

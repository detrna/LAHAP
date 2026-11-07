import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Db } from "../../../../../infrastructure/database/prisma/db.js";
import type { Page, PaymentListQuery, PaymentRecord } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toPaymentRecord } from "../to-records.js";

function matching(orm: Db["orm"], query: PaymentListQuery, subscriptionIds: readonly string[] | undefined) {
    let payments = orm.public.Payment;
    if (query.userId !== undefined) payments = payments.where({ userId: query.userId });
    if (query.status !== undefined) payments = payments.where({ status: query.status });
    if (query.method !== undefined) payments = payments.where({ method: query.method });
    if (query.type !== undefined) payments = payments.where({ type: query.type });
    if (subscriptionIds !== undefined) {
        payments = payments.where(row => row.subscriptionId.in([...subscriptionIds] as Varchar<36>[]));
    }
    if (query.createdFrom !== undefined) payments = payments.where(row => row.createdAt.gte(query.createdFrom!));
    if (query.createdBefore !== undefined) payments = payments.where(row => row.createdAt.lt(query.createdBefore!));
    return payments;
}

export async function listPayments(
    this: PrismaOrdersRepository,
    query: PaymentListQuery,
): Promise<Page<PaymentRecord>> {
    try {
        let subscriptionIds: readonly string[] | undefined;
        if (query.needsRefund !== undefined) {
            const rows = await this.db.orm.public.Subscription.where({ needsRefund: query.needsRefund })
                .select("id")
                .all();
            subscriptionIds = rows.map(row => row.id);
            if (subscriptionIds.length === 0) return { items: [], total: 0 };
        }
        const [rows, totals] = await Promise.all([
            matching(this.db.orm, query, subscriptionIds)
                .orderBy([row => row.createdAt.desc(), row => row.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matching(this.db.orm, query, subscriptionIds).aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toPaymentRecord), total: totals.total };
    } catch (cause) {
        throw new OrdersRepositoryFailureError("listPayments", cause);
    }
}

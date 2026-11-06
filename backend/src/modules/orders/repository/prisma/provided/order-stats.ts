import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { fromNumeric } from "../../../../../infrastructure/database/prisma/numeric.js";
import type { SubscriptionStatus } from "../../../domain/subscription.domain.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

export async function countPaidServiceDays(
    this: PrismaOrdersRepository,
    userId: string,
    statuses: readonly SubscriptionStatus[],
): Promise<number> {
    try {
        const subscriptions = await this.db.orm.public.Subscription.where({ userId })
            .where(subscription => subscription.status.in([...statuses] as Varchar<30>[]))
            .select("id")
            .all();
        if (subscriptions.length === 0) return 0;
        const days = await this.db.orm.public.Order.where(order =>
            order.subscriptionId.in(subscriptions.map(subscription => subscription.id) as Varchar<36>[]),
        )
            .groupBy("serviceDate")
            .aggregate(aggregate => ({ slots: aggregate.count() }));
        return days.length;
    } catch (cause) {
        throw new OrdersRepositoryFailureError("countPaidServiceDays", cause);
    }
}

export async function sumTierDiscounts(
    this: PrismaOrdersRepository,
    tierIds: readonly string[],
    statuses: readonly SubscriptionStatus[],
): Promise<ReadonlyMap<string, number>> {
    if (tierIds.length === 0) return new Map();
    try {
        const groups = await this.db.orm.public.Subscription.where(subscription =>
            subscription.tierId.in(tierIds as Varchar<36>[]),
        )
            .where(subscription => subscription.status.in([...statuses] as Varchar<30>[]))
            .groupBy("tierId")
            .aggregate(aggregate => ({ total: aggregate.sum("tierDiscount") }));
        const totals = new Map<string, number>();
        for (const group of groups) {
            if (group.tierId !== null && group.total !== null)
                totals.set(group.tierId, fromNumeric(String(group.total)));
        }
        return totals;
    } catch (cause) {
        throw new OrdersRepositoryFailureError("sumTierDiscounts", cause);
    }
}

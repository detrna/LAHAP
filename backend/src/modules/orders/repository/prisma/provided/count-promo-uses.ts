import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { SubscriptionStatus } from "../../../domain/subscription.domain.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

export async function countPromoUses(
    this: PrismaOrdersRepository,
    promoCodeIds: readonly string[],
    statuses: readonly SubscriptionStatus[],
): Promise<ReadonlyMap<string, number>> {
    if (promoCodeIds.length === 0) return new Map();
    try {
        const groups = await this.db.orm.public.Subscription.where(row =>
            row.promoCodeId.in(promoCodeIds as Varchar<36>[]),
        )
            .where(row => row.status.in([...statuses] as Varchar<30>[]))
            .groupBy("promoCodeId")
            .aggregate(aggregate => ({ uses: aggregate.count() }));
        const uses = new Map<string, number>();
        for (const group of groups) {
            if (group.promoCodeId !== null) uses.set(group.promoCodeId, group.uses);
        }
        return uses;
    } catch (cause) {
        throw new OrdersRepositoryFailureError("countPromoUses", cause);
    }
}

export async function countPromoUsesByUser(
    this: PrismaOrdersRepository,
    promoCodeId: string,
    userId: string,
    statuses: readonly SubscriptionStatus[],
): Promise<number> {
    try {
        const result = await this.db.orm.public.Subscription.where({ promoCodeId, userId })
            .where(row => row.status.in([...statuses] as Varchar<30>[]))
            .aggregate(aggregate => ({ uses: aggregate.count() }));
        return result.uses;
    } catch (cause) {
        throw new OrdersRepositoryFailureError("countPromoUsesByUser", cause);
    }
}

export async function hasSubscriptionsWithPromo(
    this: PrismaOrdersRepository,
    promoCodeId: string,
    statuses: readonly SubscriptionStatus[],
): Promise<boolean> {
    try {
        const row = await this.db.orm.public.Subscription.where({ promoCodeId })
            .where(subscription => subscription.status.in([...statuses] as Varchar<30>[]))
            .select("id")
            .first();
        return row !== null;
    } catch (cause) {
        throw new OrdersRepositoryFailureError("hasSubscriptionsWithPromo", cause);
    }
}

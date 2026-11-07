import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type {
    DeliveryMethodChangeRecord,
    MethodChangeListQuery,
    Page,
} from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { withSlots, withSlotsOne } from "./method-change-rows.js";

export async function findMethodChangeById(
    this: PrismaOrdersRepository,
    id: string,
): Promise<DeliveryMethodChangeRecord | null> {
    try {
        return await withSlotsOne(this.db.orm, await this.db.orm.public.DeliveryMethodChange.where({ id }).first());
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findMethodChangeById", cause);
    }
}

export async function findMethodChangesBySubscriptionIds(
    this: PrismaOrdersRepository,
    subscriptionIds: readonly string[],
): Promise<readonly DeliveryMethodChangeRecord[]> {
    if (subscriptionIds.length === 0) return [];
    try {
        const rows = await this.db.orm.public.DeliveryMethodChange.where(change =>
            change.subscriptionId.in([...new Set(subscriptionIds)] as Varchar<36>[]),
        )
            .orderBy([change => change.createdAt.asc(), change => change.id.asc()])
            .all();
        return await withSlots(this.db.orm, rows);
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findMethodChangesBySubscriptionIds", cause);
    }
}

export async function listMethodChanges(
    this: PrismaOrdersRepository,
    query: MethodChangeListQuery,
): Promise<Page<DeliveryMethodChangeRecord>> {
    try {
        const matching = () =>
            query.needsRefund === undefined
                ? this.db.orm.public.DeliveryMethodChange
                : this.db.orm.public.DeliveryMethodChange.where({ needsRefund: query.needsRefund });
        const [rows, totals] = await Promise.all([
            matching()
                .orderBy([change => change.createdAt.desc(), change => change.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matching().aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: await withSlots(this.db.orm, rows), total: totals.total };
    } catch (cause) {
        throw new OrdersRepositoryFailureError("listMethodChanges", cause);
    }
}

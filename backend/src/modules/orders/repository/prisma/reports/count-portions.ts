import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { PortionCountRecord, PortionQuery } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

export async function countPortions(
    this: PrismaOrdersRepository,
    query: PortionQuery,
): Promise<readonly PortionCountRecord[]> {
    if (query.menuScheduleIds?.length === 0) return [];
    try {
        let orders = this.db.orm.public.Order.where(row => row.status.in([...query.statuses] as Varchar<30>[]));
        if (query.menuScheduleIds !== undefined) {
            orders = orders.where(row => row.menuScheduleId.in([...query.menuScheduleIds!] as Varchar<36>[]));
        }
        if (query.serviceDateFrom !== undefined)
            orders = orders.where(row => row.serviceDate.gte(query.serviceDateFrom!));
        if (query.serviceDateTo !== undefined) orders = orders.where(row => row.serviceDate.lte(query.serviceDateTo!));
        const rows = await orders.select("subscriptionId", "menuScheduleId", "usesAlternativeMenu").all();
        if (rows.length === 0) return [];

        const subscriptionIds = [...new Set(rows.map(row => row.subscriptionId))];
        const counted = await this.db.orm.public.Subscription.where(row => row.id.in(subscriptionIds as Varchar<36>[]))
            .where(row => row.status.in([...query.subscriptionStatuses] as Varchar<30>[]))
            .select("id")
            .all();
        const countedIds = new Set(counted.map(row => row.id));

        const portions = new Map<string, PortionCountRecord>();
        for (const row of rows) {
            if (!countedIds.has(row.subscriptionId)) continue;
            const key = `${row.menuScheduleId}:${row.usesAlternativeMenu}`;
            const current = portions.get(key);
            portions.set(key, {
                menuScheduleId: row.menuScheduleId,
                usesAlternativeMenu: row.usesAlternativeMenu,
                portions: (current?.portions ?? 0) + 1,
            });
        }
        return [...portions.values()];
    } catch (cause) {
        throw new OrdersRepositoryFailureError("countPortions", cause);
    }
}

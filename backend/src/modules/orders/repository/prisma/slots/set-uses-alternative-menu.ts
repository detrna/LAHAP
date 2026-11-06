import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { AlternativeMenuChange, OrderRecord } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toOrderRecord } from "../to-records.js";

export async function setUsesAlternativeMenu(
    this: PrismaOrdersRepository,
    change: AlternativeMenuChange,
): Promise<OrderRecord | null> {
    try {
        const [updated] = await this.db.orm.public.Order.where({ id: change.orderId })
            .where(row => row.status.in([...change.allowedStatuses] as Varchar<30>[]))
            .updateAll({ usesAlternativeMenu: change.usesAlternativeMenu });
        return updated === undefined ? null : toOrderRecord(updated);
    } catch (cause) {
        throw new OrdersRepositoryFailureError("setUsesAlternativeMenu", cause);
    }
}

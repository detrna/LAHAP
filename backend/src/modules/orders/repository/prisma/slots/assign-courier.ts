import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { getForeignKeyViolationConstraint } from "../../../../../infrastructure/database/prisma/sql-errors.js";
import { InvalidStateError } from "../../../../../shared/errors/invalid-state-error.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

export async function assignCourier(
    this: PrismaOrdersRepository,
    orderIds: readonly string[],
    courierId: string | null,
): Promise<number> {
    if (orderIds.length === 0) return 0;
    try {
        const updated = await this.db.orm.public.Order.where(row =>
            row.id.in([...orderIds] as Varchar<36>[]),
        ).updateAll({
            courierId,
        });
        return updated.length;
    } catch (cause) {
        if (getForeignKeyViolationConstraint(cause) === "order_courier_id_fkey") {
            throw new InvalidStateError("courier is not an active courier", { cause });
        }
        throw new OrdersRepositoryFailureError("assignCourier", cause);
    }
}

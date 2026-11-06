import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { OrderStatus } from "../../../domain/order.domain.js";
import type { SlotTransition, TransitionedSlot } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toOrderRecord } from "../to-records.js";

export async function transitionSlots(
    this: PrismaOrdersRepository,
    transition: SlotTransition,
): Promise<readonly TransitionedSlot[]> {
    const { orderIds, from, to, actorId } = transition;
    if (orderIds.length === 0) return [];
    try {
        return await this.db.transaction(async tx => {
            const locked = await tx.orm.public.Order.where(row => row.id.in([...orderIds] as Varchar<36>[]))
                .where(row => row.status.in([...from] as Varchar<30>[]))
                .orderBy(row => row.id.asc())
                .forUpdate()
                .all();
            const changed: TransitionedSlot[] = [];
            for (const row of locked) {
                const updated = await tx.orm.public.Order.where({ id: row.id }).update({
                    status: to,
                    ...(transition.skipReason !== undefined ? { skipReason: transition.skipReason } : {}),
                });
                if (updated === null) continue;
                const history = await tx.orm.public.OrderStatusHistory.create({
                    orderId: row.id,
                    changedById: actorId,
                    fromStatus: row.status,
                    toStatus: to,
                    adminNote: transition.adminNote ?? null,
                });
                changed.push({
                    order: toOrderRecord(updated),
                    fromStatus: row.status as OrderStatus,
                    changedAt: history.changedAt,
                });
            }
            return changed;
        });
    } catch (cause) {
        throw new OrdersRepositoryFailureError("transitionSlots", cause);
    }
}

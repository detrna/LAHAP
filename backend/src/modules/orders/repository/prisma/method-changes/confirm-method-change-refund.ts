import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { DeliveryMethodChangeRecord } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { withSlotsOne } from "./method-change-rows.js";

export async function confirmMethodChangeRefund(
    this: PrismaOrdersRepository,
    id: string,
    refundedAt: Temporal.PlainDateTime,
): Promise<DeliveryMethodChangeRecord | null> {
    try {
        return await this.db.transaction(async tx => {
            const updated = await tx.orm.public.DeliveryMethodChange.where({ id, needsRefund: true }).update({
                needsRefund: false,
                refundedAt,
            });
            if (updated === null) return null;
            if (updated.paymentId !== null && updated.status === "Expire") {
                await tx.orm.public.Payment.where({ id: updated.paymentId, status: "Success" }).update({
                    status: "Refund",
                });
            }
            return withSlotsOne(tx.orm, updated);
        });
    } catch (cause) {
        throw new OrdersRepositoryFailureError("confirmMethodChangeRefund", cause);
    }
}

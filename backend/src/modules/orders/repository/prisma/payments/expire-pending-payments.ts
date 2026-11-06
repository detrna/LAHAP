import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { ExpiredPayment } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

export async function expirePendingPayments(
    this: PrismaOrdersRepository,
    createdBefore: Temporal.PlainDateTime,
): Promise<readonly ExpiredPayment[]> {
    try {
        return await this.db.transaction(async tx => {
            const expired = await tx.orm.public.Payment.where({ status: "Pending" })
                .where(payment => payment.createdAt.lt(createdBefore))
                .updateAll({ status: "Expire" });
            const subscriptionIds = [...new Set(expired.map(payment => payment.subscriptionId))];
            if (subscriptionIds.length > 0) {
                await tx.orm.public.Subscription.where(subscription =>
                    subscription.id.in(subscriptionIds as Varchar<36>[]),
                )
                    .where({ status: "Pending" })
                    .updateAll({ status: "Expire" });
            }
            return expired.map(payment => ({ paymentId: payment.id, subscriptionId: payment.subscriptionId }));
        });
    } catch (cause) {
        throw new OrdersRepositoryFailureError("expirePendingPayments", cause);
    }
}

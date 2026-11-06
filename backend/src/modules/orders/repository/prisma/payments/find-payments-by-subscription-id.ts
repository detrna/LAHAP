import type { PaymentRecord } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toPaymentRecord } from "../to-records.js";

export async function findPaymentsBySubscriptionId(
    this: PrismaOrdersRepository,
    subscriptionId: string,
): Promise<readonly PaymentRecord[]> {
    try {
        const rows = await this.db.orm.public.Payment.where({ subscriptionId })
            .orderBy(payment => payment.createdAt.desc())
            .all();
        return rows.map(toPaymentRecord);
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findPaymentsBySubscriptionId", cause);
    }
}

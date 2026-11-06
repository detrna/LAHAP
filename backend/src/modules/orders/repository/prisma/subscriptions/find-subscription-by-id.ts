import type { SubscriptionRecord } from "../../../service/interfaces/orders.repository.js";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";
import { toSubscriptionRecord } from "../to-records.js";

export async function findSubscriptionById(
    this: PrismaOrdersRepository,
    id: string,
): Promise<SubscriptionRecord | null> {
    try {
        const row = await this.db.orm.public.Subscription.where({ id }).first();
        return row === null ? null : toSubscriptionRecord(row);
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findSubscriptionById", cause);
    }
}

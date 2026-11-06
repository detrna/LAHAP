import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

export async function findUserIdsWithLastSuccessEndBefore(
    this: PrismaOrdersRepository,
    date: Temporal.PlainDate,
): Promise<readonly string[]> {
    try {
        const groups = await this.db.orm.public.Subscription.where({ status: "Success" })
            .groupBy("userId")
            .aggregate(aggregate => ({ lastEndDate: aggregate.max("endDate") }));
        return groups
            .filter(group => group.lastEndDate !== null && Temporal.PlainDate.compare(group.lastEndDate, date) < 0)
            .map(group => group.userId);
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findUserIdsWithLastSuccessEndBefore", cause);
    }
}

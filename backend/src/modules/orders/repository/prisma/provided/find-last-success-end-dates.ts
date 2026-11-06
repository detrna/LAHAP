import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { OrdersRepositoryFailureError } from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

export async function findLastSuccessEndDates(
    this: PrismaOrdersRepository,
    userIds: readonly string[],
): Promise<ReadonlyMap<string, Temporal.PlainDate>> {
    if (userIds.length === 0) return new Map();

    try {
        const groups = await this.db.orm.public.Subscription.where({ status: "Success" })
            .where(subscription => subscription.userId.in(userIds as Varchar<36>[]))
            .groupBy("userId")
            .aggregate(aggregate => ({ lastEndDate: aggregate.max("endDate") }));
        const dates = new Map<string, Temporal.PlainDate>();
        for (const group of groups) {
            if (group.lastEndDate !== null) dates.set(group.userId, group.lastEndDate);
        }
        return dates;
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findLastSuccessEndDates", cause);
    }
}

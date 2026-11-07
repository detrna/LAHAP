import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import {
    OrdersRepositoryFailureError,
    type LastSuccessSummaryRecord,
} from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

interface PaidSubscriptionRow {
    readonly id: string;
    readonly userId: string;
    readonly packageId: string;
    readonly endDate: Temporal.PlainDate;
    readonly createdAt: Temporal.PlainDateTime;
}

function isLater(row: PaidSubscriptionRow, than: PaidSubscriptionRow): boolean {
    return (
        (Temporal.PlainDate.compare(row.endDate, than.endDate) ||
            Temporal.PlainDateTime.compare(row.createdAt, than.createdAt) ||
            row.id.localeCompare(than.id)) > 0
    );
}

export async function findLastSuccessSummaries(
    this: PrismaOrdersRepository,
    userIds: readonly string[],
): Promise<readonly LastSuccessSummaryRecord[]> {
    if (userIds.length === 0) return [];

    try {
        const rows = await this.db.orm.public.Subscription.where({ status: "Success" })
            .where(subscription => subscription.userId.in(userIds as Varchar<36>[]))
            .select("id", "userId", "packageId", "endDate", "createdAt")
            .all();

        const latest = new Map<string, PaidSubscriptionRow>();
        const counts = new Map<string, number>();
        for (const row of rows) {
            counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
            const current = latest.get(row.userId);
            if (current === undefined || isLater(row, current)) latest.set(row.userId, row);
        }

        return [...latest.values()].map(row => ({
            userId: row.userId,
            lastEndDate: row.endDate,
            lastPackageId: row.packageId,
            totalSubscriptions: counts.get(row.userId) ?? 0,
        }));
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findLastSuccessSummaries", cause);
    }
}

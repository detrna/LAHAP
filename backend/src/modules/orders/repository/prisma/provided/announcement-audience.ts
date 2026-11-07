import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import {
    OrdersRepositoryFailureError,
    type AnnouncementTargetQuery,
    type AnnouncementTargetRecord,
    type PackageAudienceQuery,
    type ScheduleAudienceQuery,
} from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

export async function findCustomerIdsByPackage(
    this: PrismaOrdersRepository,
    query: PackageAudienceQuery,
): Promise<readonly string[]> {
    if (query.subscriptionStatuses.length === 0) return [];
    try {
        const subscriptions = await this.db.orm.public.Subscription.where({ packageId: query.packageId })
            .where(subscription => subscription.status.in([...query.subscriptionStatuses] as Varchar<30>[]))
            .where(subscription => subscription.endDate.gte(query.endDateFrom))
            .select("userId")
            .all();
        return [...new Set(subscriptions.map(subscription => subscription.userId))];
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findCustomerIdsByPackage", cause);
    }
}

export async function findCustomerIdsBySchedule(
    this: PrismaOrdersRepository,
    query: ScheduleAudienceQuery,
): Promise<readonly string[]> {
    if (query.subscriptionStatuses.length === 0) return [];
    try {
        const slots = await this.db.orm.public.Order.where({ menuScheduleId: query.scheduleId })
            .where(order => order.status.notIn([...query.excludedSlotStatuses] as Varchar<30>[]))
            .select("subscriptionId")
            .all();
        if (slots.length === 0) return [];
        const subscriptions = await this.db.orm.public.Subscription.where(subscription =>
            subscription.id.in([...new Set(slots.map(slot => slot.subscriptionId))] as Varchar<36>[]),
        )
            .where(subscription => subscription.status.in([...query.subscriptionStatuses] as Varchar<30>[]))
            .select("userId")
            .all();
        return [...new Set(subscriptions.map(subscription => subscription.userId))];
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findCustomerIdsBySchedule", cause);
    }
}

export async function findAnnouncementTargets(
    this: PrismaOrdersRepository,
    query: AnnouncementTargetQuery,
): Promise<AnnouncementTargetRecord> {
    if (query.subscriptionStatuses.length === 0) return { packageIds: [], scheduleIds: [] };
    try {
        const subscriptions = await this.db.orm.public.Subscription.where({ userId: query.userId })
            .where(subscription => subscription.status.in([...query.subscriptionStatuses] as Varchar<30>[]))
            .select("id", "packageId", "endDate")
            .all();
        if (subscriptions.length === 0) return { packageIds: [], scheduleIds: [] };

        const packageIds = new Set(
            subscriptions
                .filter(subscription => Temporal.PlainDate.compare(subscription.endDate, query.packageEndDateFrom) >= 0)
                .map(subscription => subscription.packageId),
        );
        const slots = await this.db.orm.public.Order.where(order =>
            order.subscriptionId.in(subscriptions.map(subscription => subscription.id) as Varchar<36>[]),
        )
            .where(order => order.status.notIn([...query.excludedSlotStatuses] as Varchar<30>[]))
            .select("menuScheduleId")
            .all();
        return {
            packageIds: [...packageIds],
            scheduleIds: [...new Set(slots.map(slot => slot.menuScheduleId))],
        };
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findAnnouncementTargets", cause);
    }
}

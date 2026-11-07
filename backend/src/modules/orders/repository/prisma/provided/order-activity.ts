import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { SubscriptionStatus } from "../../../domain/subscription.domain.js";
import {
    OrdersRepositoryFailureError,
    type ActiveSubscriberQuery,
    type SubscriptionPeriodRecord,
} from "../../../service/interfaces/orders.repository.js";
import type { PrismaOrdersRepository } from "../orders-repository.js";

interface SlotOnSchedule {
    readonly subscriptionId: string;
    readonly menuScheduleId: string;
    readonly startDate: Temporal.PlainDate;
    readonly endDate: Temporal.PlainDate;
}

async function findSlotsOnSchedules(
    repository: PrismaOrdersRepository,
    scheduleIds: readonly string[],
    statuses: readonly SubscriptionStatus[],
    onlyAlternative: boolean,
): Promise<readonly SlotOnSchedule[]> {
    let orders = repository.db.orm.public.Order.where(order =>
        order.menuScheduleId.in([...scheduleIds] as Varchar<36>[]),
    );
    if (onlyAlternative) orders = orders.where({ usesAlternativeMenu: true });
    const slots = await orders.select("subscriptionId", "menuScheduleId").all();
    if (slots.length === 0) return [];

    const subscriptions = await repository.db.orm.public.Subscription.where(subscription =>
        subscription.id.in([...new Set(slots.map(slot => slot.subscriptionId))] as Varchar<36>[]),
    )
        .where(subscription => subscription.status.in([...statuses] as Varchar<30>[]))
        .select("id", "startDate", "endDate")
        .all();
    const periods = new Map<string, { startDate: Temporal.PlainDate; endDate: Temporal.PlainDate }>(
        subscriptions.map(subscription => [subscription.id, subscription]),
    );
    return slots.flatMap(slot => {
        const period = periods.get(slot.subscriptionId);
        return period === undefined
            ? []
            : [{ subscriptionId: slot.subscriptionId, menuScheduleId: slot.menuScheduleId, ...period }];
    });
}

export async function countActiveSubscribers(
    this: PrismaOrdersRepository,
    query: ActiveSubscriberQuery,
): Promise<ReadonlyMap<string, number>> {
    if (query.packageIds.length === 0) return new Map();
    try {
        const subscriptions = await this.db.orm.public.Subscription.where(subscription =>
            subscription.packageId.in([...query.packageIds] as Varchar<36>[]),
        )
            .where(subscription => subscription.status.in([...query.subscriptionStatuses] as Varchar<30>[]))
            .where(subscription => subscription.endDate.gte(query.endDateFrom))
            .select("packageId", "userId")
            .all();
        const customers = new Map<string, Set<string>>();
        for (const { packageId, userId } of subscriptions) {
            const known = customers.get(packageId) ?? new Set<string>();
            known.add(userId);
            customers.set(packageId, known);
        }
        return new Map([...customers].map(([packageId, userIds]) => [packageId, userIds.size]));
    } catch (cause) {
        throw new OrdersRepositoryFailureError("countActiveSubscribers", cause);
    }
}

export async function findScheduleIdsWithSlots(
    this: PrismaOrdersRepository,
    scheduleIds: readonly string[],
    subscriptionStatuses: readonly SubscriptionStatus[],
): Promise<readonly string[]> {
    if (scheduleIds.length === 0 || subscriptionStatuses.length === 0) return [];
    try {
        const slots = await findSlotsOnSchedules(this, scheduleIds, subscriptionStatuses, false);
        return [...new Set(slots.map(slot => slot.menuScheduleId))];
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findScheduleIdsWithSlots", cause);
    }
}

export async function findScheduleIdsUsingAlternative(
    this: PrismaOrdersRepository,
    scheduleIds: readonly string[],
    subscriptionStatuses: readonly SubscriptionStatus[],
): Promise<readonly string[]> {
    if (scheduleIds.length === 0 || subscriptionStatuses.length === 0) return [];
    try {
        const slots = await findSlotsOnSchedules(this, scheduleIds, subscriptionStatuses, true);
        return [...new Set(slots.map(slot => slot.menuScheduleId))];
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findScheduleIdsUsingAlternative", cause);
    }
}

export async function findSubscriptionPeriods(
    this: PrismaOrdersRepository,
    scheduleIds: readonly string[],
    subscriptionStatuses: readonly SubscriptionStatus[],
): Promise<readonly SubscriptionPeriodRecord[]> {
    if (scheduleIds.length === 0 || subscriptionStatuses.length === 0) return [];
    try {
        const slots = await findSlotsOnSchedules(this, scheduleIds, subscriptionStatuses, false);
        return slots.map(({ menuScheduleId, startDate, endDate }) => ({
            scheduleId: menuScheduleId,
            startDate,
            endDate,
        }));
    } catch (cause) {
        throw new OrdersRepositoryFailureError("findSubscriptionPeriods", cause);
    }
}

export async function deleteSlotsOfSubscriptions(
    this: PrismaOrdersRepository,
    scheduleIds: readonly string[],
    subscriptionStatuses: readonly SubscriptionStatus[],
): Promise<void> {
    if (scheduleIds.length === 0 || subscriptionStatuses.length === 0) return;
    try {
        const slots = await findSlotsOnSchedules(this, scheduleIds, subscriptionStatuses, false);
        if (slots.length === 0) return;
        await this.db.orm.public.Order.where(order =>
            order.subscriptionId.in([...new Set(slots.map(slot => slot.subscriptionId))] as Varchar<36>[]),
        )
            .where(order => order.menuScheduleId.in([...scheduleIds] as Varchar<36>[]))
            .deleteAndCount();
    } catch (cause) {
        throw new OrdersRepositoryFailureError("deleteSlotsOfSubscriptions", cause);
    }
}

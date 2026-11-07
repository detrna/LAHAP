import type { SubscriptionStatus } from "../../domain/subscription.domain.js";
import type { SubscriptionPeriodRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";

const PENDING_OR_PAID: readonly SubscriptionStatus[] = ["Pending", "Success"];
const INACTIVE: readonly SubscriptionStatus[] = ["Expire", "Dibatalkan"];

function distinct(ids: readonly string[]): string[] {
    return [...new Set(ids)];
}

export async function countActiveSubscribers(
    this: OrdersService,
    packageIds: readonly string[],
    today: Temporal.PlainDate,
): Promise<ReadonlyMap<string, number>> {
    if (packageIds.length === 0) return new Map();
    return this.ordersRepository.countActiveSubscribers({
        packageIds: distinct(packageIds),
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
        endDateFrom: today,
    });
}

export async function findSchedulesWithOrders(
    this: OrdersService,
    scheduleIds: readonly string[],
    statuses: readonly SubscriptionStatus[],
): Promise<readonly string[]> {
    if (scheduleIds.length === 0 || statuses.length === 0) return [];
    return this.ordersRepository.findScheduleIdsWithSlots(distinct(scheduleIds), statuses);
}

export async function findSchedulesUsingAlternative(
    this: OrdersService,
    scheduleIds: readonly string[],
): Promise<readonly string[]> {
    if (scheduleIds.length === 0) return [];
    return this.ordersRepository.findScheduleIdsUsingAlternative(distinct(scheduleIds), PAID_SUBSCRIPTION_STATUSES);
}

export async function findSubscriptionPeriods(
    this: OrdersService,
    scheduleIds: readonly string[],
): Promise<readonly SubscriptionPeriodRecord[]> {
    if (scheduleIds.length === 0) return [];
    return this.ordersRepository.findSubscriptionPeriods(distinct(scheduleIds), PENDING_OR_PAID);
}

export async function deleteInactiveSlots(this: OrdersService, scheduleIds: readonly string[]): Promise<void> {
    if (scheduleIds.length === 0) return;
    await this.ordersRepository.deleteSlotsOfSubscriptions(distinct(scheduleIds), INACTIVE);
}

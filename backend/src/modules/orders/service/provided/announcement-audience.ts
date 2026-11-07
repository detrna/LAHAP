import type { OrderStatus } from "../../domain/order.domain.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { AnnouncementTargetRecord } from "../interfaces/orders.repository.js";
import type { OrdersService } from "../orders.service.js";

const SKIPPED_SLOT_STATUSES: readonly OrderStatus[] = ["Dilewati"];

export async function findCustomerIdsForPackage(
    this: OrdersService,
    packageId: string,
    today: Temporal.PlainDate,
): Promise<readonly string[]> {
    return this.ordersRepository.findCustomerIdsByPackage({
        packageId,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
        endDateFrom: today,
    });
}

export async function findCustomerIdsForSchedule(this: OrdersService, scheduleId: string): Promise<readonly string[]> {
    return this.ordersRepository.findCustomerIdsBySchedule({
        scheduleId,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
        excludedSlotStatuses: SKIPPED_SLOT_STATUSES,
    });
}

export async function findAnnouncementTargetsOf(
    this: OrdersService,
    userId: string,
    today: Temporal.PlainDate,
): Promise<AnnouncementTargetRecord> {
    return this.ordersRepository.findAnnouncementTargets({
        userId,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
        packageEndDateFrom: today,
        excludedSlotStatuses: SKIPPED_SLOT_STATUSES,
    });
}

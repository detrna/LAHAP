import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
import type { BulkUpdateResult } from "../../../../shared/response/batch-result.js";
import { resolveDateRange, type DateRangeInput } from "../../../../shared/time/date-range.js";
import type { CourierScheduleEntry, OrderStatus } from "../../domain/order.domain.js";
import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import type { OrdersService } from "../orders.service.js";

const OVERVIEW_DAYS = 7;
const OVERVIEW_MAX_DAYS = 31;
const DELIVERED_STATUSES: readonly OrderStatus[] = ["Terjadwal", "Disiapkan", "Diantar", "Selesai"];
const ASSIGNABLE_STATUSES: readonly OrderStatus[] = ["Terjadwal", "Disiapkan", "Diantar"];

export type CourierAssignment = { readonly courierId: string | null } & (
    | { readonly orderIds: readonly string[] }
    | {
          readonly date: Temporal.PlainDate;
          readonly deliveryTime: Temporal.PlainTime;
          readonly packageId?: string | undefined;
      }
);

export async function listCourierAssignments(
    this: OrdersService,
    input: DateRangeInput,
): Promise<readonly CourierScheduleEntry[]> {
    const { from, to } = resolveDateRange(input, {
        defaultFrom: this.clock.now().toPlainDate(),
        defaultSpanDays: OVERVIEW_DAYS,
        maxDays: OVERVIEW_MAX_DAYS,
    });
    const slots = (
        await this.ordersRepository.findSlots({
            serviceDateFrom: from,
            serviceDateTo: to,
            statuses: DELIVERED_STATUSES,
            subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
        })
    ).filter(slot => slot.order.isDelivery);
    if (slots.length === 0) return [];

    const scheduleIds = [...new Set(slots.map(slot => slot.order.menuScheduleId))];
    const courierIds = [
        ...new Set(slots.flatMap(slot => (slot.order.courierId === null ? [] : [slot.order.courierId]))),
    ];
    const [schedules, couriers] = await Promise.all([
        this.catalog.findSchedules({ ids: scheduleIds }),
        this.customers.getSummaries(courierIds),
    ]);
    const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));
    const courierById = new Map(couriers.map(courier => [courier.id, courier]));

    const groups = new Map<string, { entry: Omit<CourierScheduleEntry, "courier">; couriers: Set<string> }>();
    for (const { order } of slots) {
        const schedule = scheduleById.get(order.menuScheduleId);
        if (schedule === undefined) continue;
        const key = `${schedule.date} ${schedule.deliveryTime.time}`;
        const group = groups.get(key) ?? {
            entry: { date: schedule.date, deliveryTime: schedule.deliveryTime, deliveryCount: 0, unassignedCount: 0 },
            couriers: new Set<string>(),
        };
        group.entry = {
            ...group.entry,
            deliveryCount: group.entry.deliveryCount + 1,
            unassignedCount: group.entry.unassignedCount + (order.courierId === null ? 1 : 0),
        };
        if (order.courierId !== null) group.couriers.add(order.courierId);
        groups.set(key, group);
    }

    return [...groups.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, { entry, couriers: assigned }]) => {
            const [only] = [...assigned];
            const sole = assigned.size === 1 && entry.unassignedCount === 0 && only !== undefined;
            return { ...entry, courier: sole ? (courierById.get(only) ?? null) : null };
        });
}

export async function assignCourier(this: OrdersService, assignment: CourierAssignment): Promise<BulkUpdateResult> {
    const { courierId } = assignment;
    if (courierId !== null) {
        const active = await this.customers.filterActiveUserIds([courierId], "COURIER");
        if (!active.includes(courierId)) throw new InvalidStateError("courier is not an active courier");
    }

    let menuScheduleIds: readonly string[] | undefined;
    if (!("orderIds" in assignment)) {
        const schedules = await this.catalog.findSchedules({
            from: assignment.date,
            to: assignment.date,
            deliveryTime: assignment.deliveryTime,
            ...(assignment.packageId !== undefined ? { packageId: assignment.packageId } : {}),
        });
        menuScheduleIds = schedules.map(schedule => schedule.id);
    }
    const slots = await this.ordersRepository.findSlots({
        ...("orderIds" in assignment ? { orderIds: assignment.orderIds } : { menuScheduleIds }),
        statuses: ASSIGNABLE_STATUSES,
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    const orderIds = slots.filter(slot => slot.order.isDelivery).map(slot => slot.order.id);
    return { updatedCount: await this.ordersRepository.assignCourier(orderIds, courierId) };
}

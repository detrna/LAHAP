import { PAID_SUBSCRIPTION_STATUSES } from "../../domain/paid-subscriptions.js";
import { isDueForPreparation, preparationHorizon } from "../../domain/slot-preparation.js";
import type { OrdersService } from "../orders.service.js";

export interface PreparationResult {
    readonly preparedCount: number;
}

export async function prepareDueSlots(this: OrdersService, leadMinutes: number): Promise<PreparationResult> {
    const now = this.clock.now();
    const slots = await this.ordersRepository.findSlots({
        statuses: ["Terjadwal"],
        serviceDateFrom: now.toPlainDate(),
        serviceDateTo: preparationHorizon(now, leadMinutes),
        subscriptionStatuses: PAID_SUBSCRIPTION_STATUSES,
    });
    if (slots.length === 0) return { preparedCount: 0 };

    const schedules = await this.catalog.findSchedules({
        ids: [...new Set(slots.map(slot => slot.order.menuScheduleId))],
    });
    const timeBySchedule = new Map(schedules.map(schedule => [schedule.id, schedule.deliveryTime.time]));
    const due = slots.filter(slot => {
        const time = timeBySchedule.get(slot.order.menuScheduleId);
        return (
            time !== undefined &&
            isDueForPreparation(slot.order.serviceDate, Temporal.PlainTime.from(time), now, leadMinutes)
        );
    });

    const changed = await this.ordersRepository.transitionSlots({
        orderIds: due.map(slot => slot.order.id),
        from: ["Terjadwal"],
        to: "Disiapkan",
        actorId: null,
    });
    await this.publishSlotChanges(changed, new Map(slots.map(slot => [slot.subscription.id, slot.subscription])));
    if (changed.length > 0) this.logger.info({ preparedCount: changed.length }, "slots moved to Disiapkan");
    return { preparedCount: changed.length };
}

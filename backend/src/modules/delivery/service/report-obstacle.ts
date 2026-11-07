import type { Role } from "../../../shared/auth/roles.js";
import { InvalidStateError } from "../../../shared/errors/invalid-state-error.js";
import { OrderNotFoundError } from "../../../shared/errors/order-not-found-error.js";
import { canReportObstacle } from "../domain/can-report-obstacle.js";
import type { DeliveryObstacle } from "../domain/delivery-obstacle.domain.js";
import { buildObstacleNotification, OBSTACLE_NOTIFICATION_TITLE } from "../domain/obstacle-notification.js";
import type { DeliveryService } from "./delivery.service.js";

export interface ObstacleActor {
    readonly userId: string;
    readonly role: Role;
}

export interface ObstacleInput {
    readonly note: string;
    readonly photoKey?: string | undefined;
}

async function notifyCustomer(
    service: DeliveryService,
    slot: { readonly userId: string; readonly menuScheduleId: string },
    orderId: string,
    note: string,
): Promise<void> {
    try {
        let notification = { title: OBSTACLE_NOTIFICATION_TITLE, body: note };
        try {
            const [schedule] = await service.catalog.findSchedules({ ids: [slot.menuScheduleId] });
            if (schedule !== undefined) {
                notification = buildObstacleNotification({
                    date: Temporal.PlainDate.from(schedule.date),
                    time: schedule.deliveryTime.time,
                    note,
                });
            }
        } catch (err) {
            service.logger.warn({ err, orderId }, "obstacle notification was sent without the service day");
        }
        await service.notifier.notifyUser({ userId: slot.userId, ...notification });
    } catch (err) {
        service.logger.warn({ err, orderId }, "obstacle notification was not sent");
    }
}

async function publishObstacle(
    service: DeliveryService,
    customerId: string,
    obstacle: DeliveryObstacle,
): Promise<void> {
    try {
        await service.realtime.publish(
            { userIds: [customerId], roles: ["ADMIN"] },
            { event: "slot.obstacle", data: obstacle },
        );
    } catch (err) {
        service.logger.warn({ err, orderId: obstacle.orderId }, "obstacle event was not delivered");
    }
}

export async function reportObstacle(
    this: DeliveryService,
    actor: ObstacleActor,
    orderId: string,
    input: ObstacleInput,
): Promise<DeliveryObstacle> {
    const slot = await this.slots.getSlotForObstacle(orderId);
    if (slot === null) throw new OrderNotFoundError();
    const access = canReportObstacle({ role: actor.role, userId: actor.userId, slot });
    if (access.kind === "not-found") throw new OrderNotFoundError();
    if (access.kind === "refused") throw new InvalidStateError(access.reason);

    if (input.photoKey !== undefined) await this.photoKeys.assertPhotoKeyExists(input.photoKey);
    const record = await this.deliveryRepository.createObstacle({
        orderId,
        authorId: actor.userId,
        note: input.note,
        photoKey: input.photoKey ?? null,
    });
    const [obstacle] = await this.presentObstacleRecords([record]);

    await Promise.all([notifyCustomer(this, slot, orderId, input.note), publishObstacle(this, slot.userId, obstacle!)]);
    return obstacle!;
}

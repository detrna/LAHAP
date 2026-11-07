import { toPhotoUrls } from "../../../shared/media/photo.js";
import type { CourierDelivery } from "../domain/courier-delivery.domain.js";
import type { DeliveryObstacle } from "../domain/delivery-obstacle.domain.js";
import { presentObstacles } from "../domain/present-obstacles.js";
import { toCourierDelivery } from "../domain/to-courier-delivery.js";
import type { DeliveryService } from "./delivery.service.js";

function compareDeliveries(a: CourierDelivery, b: CourierDelivery): number {
    return a.deliveryTime.time.localeCompare(b.deliveryTime.time) || a.recipientName.localeCompare(b.recipientName);
}

export async function listMyDeliveries(
    this: DeliveryService,
    courierId: string,
    date?: Temporal.PlainDate,
): Promise<readonly CourierDelivery[]> {
    const day = date ?? this.clock.now().toPlainDate();
    const schedules = await this.catalog.findSchedules({ from: day, to: day });
    if (schedules.length === 0) return [];
    const slots = await this.slots.listCourierSlots({ courierId, scheduleIds: schedules.map(schedule => schedule.id) });
    if (slots.length === 0) return [];

    const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));
    const menuIdOf = (menuScheduleId: string, usesAlternativeMenu: boolean): string | null => {
        const schedule = scheduleById.get(menuScheduleId);
        if (schedule === undefined) return null;
        return usesAlternativeMenu ? schedule.alternativeMenuId : schedule.primaryMenuId;
    };
    const menuIds = new Set<string>();
    for (const slot of slots) {
        const menuId = menuIdOf(slot.menuScheduleId, slot.usesAlternativeMenu);
        if (menuId !== null) menuIds.add(menuId);
    }

    const [menus, packages, obstacleRecords] = await Promise.all([
        this.catalog.getMenusByIds([...menuIds]),
        this.catalog.getPackagesByIds([...new Set(schedules.map(schedule => schedule.packageId))]),
        this.deliveryRepository.listObstacles(slots.map(slot => slot.orderId)),
    ]);
    const [summaries, photoUrls] = await Promise.all([
        this.users.getSummaries([
            ...new Set([...slots.map(slot => slot.userId), ...obstacleRecords.map(record => record.authorId)]),
        ]),
        toPhotoUrls(
            this.objectStorage,
            obstacleRecords.map(record => record.photoKey),
        ),
    ]);

    const menuById = new Map(menus.map(menu => [menu.id, menu]));
    const packageNameById = new Map(packages.map(item => [item.id, item.name]));
    const userById = new Map(summaries.map(user => [user.id, user]));
    const obstaclesByOrder = new Map<string, DeliveryObstacle[]>();
    for (const obstacle of presentObstacles(obstacleRecords, userById, photoUrls)) {
        obstaclesByOrder.set(obstacle.orderId, [...(obstaclesByOrder.get(obstacle.orderId) ?? []), obstacle]);
    }

    const deliveries: CourierDelivery[] = [];
    for (const slot of slots) {
        const schedule = scheduleById.get(slot.menuScheduleId);
        const menuId = menuIdOf(slot.menuScheduleId, slot.usesAlternativeMenu);
        const menu = menuId === null ? undefined : menuById.get(menuId);
        const packageName = schedule === undefined ? undefined : packageNameById.get(schedule.packageId);
        const customer = userById.get(slot.userId);
        if (schedule === undefined || menu === undefined || packageName === undefined || customer === undefined) {
            this.logger.warn(
                { orderId: slot.orderId },
                "courier slot left out because its menu, package or customer is missing",
            );
            continue;
        }
        const delivery = toCourierDelivery({
            slot,
            schedule,
            menu,
            packageName,
            phone: customer.phone,
            obstacles: obstaclesByOrder.get(slot.orderId) ?? [],
        });
        if (delivery === null) {
            this.logger.warn({ orderId: slot.orderId }, "courier slot left out because its delivery point is missing");
            continue;
        }
        deliveries.push(delivery);
    }
    return deliveries.sort(compareDeliveries);
}

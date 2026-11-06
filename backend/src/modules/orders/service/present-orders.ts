import type { Order } from "../domain/order.domain.js";
import type { OrderRecord } from "./interfaces/orders.repository.js";
import type { OrdersService } from "./orders.service.js";
import { toOrder } from "./present.js";

export async function presentOrders(this: OrdersService, records: readonly OrderRecord[]): Promise<readonly Order[]> {
    if (records.length === 0) return [];
    const orderIds = records.map(record => record.id);
    const [schedules, obstacles, completions] = await Promise.all([
        this.catalog.getSchedulesByIds([...new Set(records.map(record => record.menuScheduleId))]),
        this.obstacles.findObstaclesByOrderIds(orderIds),
        this.ordersRepository.findCompletionTimes(orderIds),
    ]);
    const scheduleById = new Map(schedules.map(schedule => [schedule.id, schedule]));

    return records.map(record => {
        const schedule = scheduleById.get(record.menuScheduleId);
        const served = schedule?.menus?.find(link => link.isPrimary === !record.usesAlternativeMenu)?.menu;
        return {
            ...toOrder(record, completions.get(record.id) ?? null),
            ...(schedule !== undefined ? { menuSchedule: schedule } : {}),
            ...(served !== undefined ? { menu: served } : {}),
            obstacles: obstacles.filter(obstacle => obstacle.orderId === record.id),
        };
    });
}

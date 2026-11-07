import type { CourierSlot, ObstacleSlot } from "../../domain/courier-source.js";

export interface CourierSlotQuery {
    readonly courierId: string;
    readonly scheduleIds: readonly string[];
}

export interface CourierSlots {
    listCourierSlots(query: CourierSlotQuery): Promise<readonly CourierSlot[]>;
    getSlotForObstacle(orderId: string): Promise<ObstacleSlot | null>;
}

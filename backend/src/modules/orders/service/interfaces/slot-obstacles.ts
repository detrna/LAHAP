import type { DeliveryObstacle } from "../../../delivery/domain/delivery-obstacle.domain.js";

export interface SlotObstacles {
    findObstaclesByOrderIds(orderIds: readonly string[]): Promise<readonly DeliveryObstacle[]>;
}

export const noSlotObstacles: SlotObstacles = {
    findObstaclesByOrderIds: async () => [],
};

import type { DeliveryObstacle } from "../domain/delivery-obstacle.domain.js";
import type { DeliveryService } from "./delivery.service.js";

export async function findObstaclesByOrderIds(
    this: DeliveryService,
    orderIds: readonly string[],
): Promise<readonly DeliveryObstacle[]> {
    return this.presentObstacleRecords(await this.deliveryRepository.listObstacles(orderIds));
}

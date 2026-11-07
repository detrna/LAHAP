import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { ObstacleRecord } from "../../service/interfaces/delivery.repository.js";
import { DeliveryRepositoryFailureError } from "../../service/interfaces/delivery.repository.js";
import type { PrismaDeliveryRepository } from "./delivery-repository.js";
import { toObstacleRecord } from "./to-obstacle-record.js";

export async function listObstacles(
    this: PrismaDeliveryRepository,
    orderIds: readonly string[],
): Promise<readonly ObstacleRecord[]> {
    if (orderIds.length === 0) return [];
    try {
        const rows = await this.db.orm.public.DeliveryObstacle.where(row =>
            row.orderId.in([...new Set(orderIds)] as Varchar<36>[]),
        )
            .orderBy([row => row.createdAt.asc(), row => row.id.asc()])
            .all();
        return rows.map(toObstacleRecord);
    } catch (cause) {
        throw new DeliveryRepositoryFailureError("listObstacles", cause);
    }
}

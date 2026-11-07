import { getForeignKeyViolationConstraint } from "../../../../infrastructure/database/prisma/sql-errors.js";
import { OrderNotFoundError } from "../../../../shared/errors/order-not-found-error.js";
import type { NewObstacleRecord, ObstacleRecord } from "../../service/interfaces/delivery.repository.js";
import { DeliveryRepositoryFailureError } from "../../service/interfaces/delivery.repository.js";
import type { PrismaDeliveryRepository } from "./delivery-repository.js";
import { toObstacleRecord } from "./to-obstacle-record.js";

export async function createObstacle(
    this: PrismaDeliveryRepository,
    record: NewObstacleRecord,
): Promise<ObstacleRecord> {
    try {
        const row = await this.db.orm.public.DeliveryObstacle.create({
            orderId: record.orderId,
            authorId: record.authorId,
            note: record.note,
            photoKey: record.photoKey,
        });
        return toObstacleRecord(row);
    } catch (cause) {
        if (getForeignKeyViolationConstraint(cause) === "delivery_obstacle_order_id_fkey") {
            throw new OrderNotFoundError({ cause });
        }
        throw new DeliveryRepositoryFailureError("createObstacle", cause);
    }
}

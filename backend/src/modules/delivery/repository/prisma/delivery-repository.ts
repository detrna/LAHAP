import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { DeliveryRepository } from "../../service/interfaces/delivery.repository.js";
import { createObstacle } from "./create-obstacle.js";
import { listObstacles } from "./list-obstacles.js";

export class PrismaDeliveryRepository implements DeliveryRepository {
    constructor(readonly db: Db) {}

    listObstacles = listObstacles;
    createObstacle = createObstacle;
}

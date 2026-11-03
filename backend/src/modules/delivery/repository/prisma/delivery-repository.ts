import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { DeliveryRepository } from "../../service/interfaces/delivery.repository.js";

export class PrismaDeliveryRepository implements DeliveryRepository {
    constructor(readonly db: Db) {}
}

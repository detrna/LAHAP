import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { OrdersRepository } from "../../service/interfaces/orders.repository.js";

export class PrismaOrdersRepository implements OrdersRepository {
    constructor(readonly db: Db) {}
}

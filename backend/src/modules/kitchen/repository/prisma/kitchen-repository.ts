import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { KitchenRepository } from "../../service/interfaces/kitchen.repository.js";

export class PrismaKitchenRepository implements KitchenRepository {
    constructor(readonly db: Db) {}
}

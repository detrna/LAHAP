import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { RetentionRepository } from "../../service/interfaces/retention.repository.js";

export class PrismaRetentionRepository implements RetentionRepository {
    constructor(readonly db: Db) {}
}

import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { NotificationsRepository } from "../../service/interfaces/notifications.repository.js";

export class PrismaNotificationsRepository implements NotificationsRepository {
    constructor(readonly db: Db) {}
}

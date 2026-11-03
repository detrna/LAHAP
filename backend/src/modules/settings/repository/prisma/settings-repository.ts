import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { SettingsRepository } from "../../service/interfaces/settings.repository.js";

export class PrismaSettingsRepository implements SettingsRepository {
    constructor(readonly db: Db) {}
}

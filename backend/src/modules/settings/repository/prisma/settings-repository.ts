import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { SettingsRepository } from "../../service/interfaces/settings.repository.js";
import { find } from "./find.js";
import { save } from "./save.js";

export class PrismaSettingsRepository implements SettingsRepository {
    constructor(readonly db: Db) {}

    find = find;
    save = save;
}

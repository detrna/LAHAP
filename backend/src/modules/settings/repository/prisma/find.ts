import { SettingsRepositoryFailureError, type SettingsRecord } from "../../service/interfaces/settings.repository.js";
import { toSettingsRecord } from "./to-settings-record.js";
import type { PrismaSettingsRepository } from "./settings-repository.js";

export async function find(this: PrismaSettingsRepository): Promise<SettingsRecord | null> {
    try {
        const row = await this.db.orm.public.Business.orderBy([
            business => business.createdAt.asc(),
            business => business.id.asc(),
        ]).first();
        return row === null ? null : toSettingsRecord(row);
    } catch (cause) {
        throw new SettingsRepositoryFailureError("find", cause);
    }
}

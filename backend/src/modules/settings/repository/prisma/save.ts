import { toNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import {
    SettingsRepositoryFailureError,
    type SettingsChanges,
    type SettingsRecord,
} from "../../service/interfaces/settings.repository.js";
import type { PrismaSettingsRepository } from "./settings-repository.js";
import { toSettingsRecord } from "./to-settings-record.js";

function toColumns(settings: SettingsChanges) {
    return {
        name: settings.name,
        whatsappNumber: settings.whatsappNumber,
        address: settings.address,
        latitude: toNumeric(settings.latitude, 8),
        longitude: toNumeric(settings.longitude, 8),
        deliveryFreeRadius: toNumeric(settings.deliveryFreeRadius, 2),
        deliveryMaxDistance: toNumeric(settings.deliveryMaxDistance, 2),
        deliveryPricePerKm: toNumeric(settings.deliveryPricePerKm, 2),
        paymentTimeoutMinutes: settings.paymentTimeoutMinutes,
    };
}

export async function save(this: PrismaSettingsRepository, settings: SettingsChanges): Promise<SettingsRecord> {
    try {
        return await this.db.transaction(async tx => {
            const existing = await tx.orm.public.Business.orderBy([
                business => business.createdAt.asc(),
                business => business.id.asc(),
            ])
                .select("id")
                .forUpdate()
                .first();
            const columns = toColumns(settings);
            if (existing === null) return toSettingsRecord(await tx.orm.public.Business.create(columns));

            const updated = await tx.orm.public.Business.where({ id: existing.id }).update(columns);
            if (updated === null) throw new Error(`business ${existing.id} vanished inside its own transaction`);
            return toSettingsRecord(updated);
        });
    } catch (cause) {
        throw new SettingsRepositoryFailureError("save", cause);
    }
}

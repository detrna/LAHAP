import { toIsoTimestamp } from "../../../shared/time/timestamp.js";
import type { Settings } from "../domain/settings.domain.js";
import type { SettingsRecord } from "./interfaces/settings.repository.js";

export function toSettings(record: SettingsRecord): Settings {
    return {
        name: record.name,
        whatsappNumber: record.whatsappNumber,
        address: record.address,
        latitude: record.latitude,
        longitude: record.longitude,
        deliveryFreeRadius: record.deliveryFreeRadius,
        deliveryMaxDistance: record.deliveryMaxDistance,
        deliveryPricePerKm: record.deliveryPricePerKm,
        paymentTimeoutMinutes: record.paymentTimeoutMinutes,
        updatedAt: toIsoTimestamp(record.updatedAt),
    };
}

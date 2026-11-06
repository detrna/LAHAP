import { fromNumeric } from "../../../../infrastructure/database/prisma/numeric.js";
import type { SettingsRecord } from "../../service/interfaces/settings.repository.js";

export interface BusinessRow {
    readonly name: string;
    readonly whatsappNumber: string;
    readonly address: string;
    readonly latitude: string;
    readonly longitude: string;
    readonly deliveryFreeRadius: string;
    readonly deliveryMaxDistance: string;
    readonly deliveryPricePerKm: string;
    readonly paymentTimeoutMinutes: number;
    readonly updatedAt: Temporal.PlainDateTime;
}

export function toSettingsRecord(row: BusinessRow): SettingsRecord {
    return {
        name: row.name,
        whatsappNumber: row.whatsappNumber,
        address: row.address,
        latitude: fromNumeric(row.latitude),
        longitude: fromNumeric(row.longitude),
        deliveryFreeRadius: fromNumeric(row.deliveryFreeRadius),
        deliveryMaxDistance: fromNumeric(row.deliveryMaxDistance),
        deliveryPricePerKm: fromNumeric(row.deliveryPricePerKm),
        paymentTimeoutMinutes: row.paymentTimeoutMinutes,
        updatedAt: row.updatedAt,
    };
}

import type { BusinessInfo, Settings } from "../../domain/settings.domain.js";
import type { SettingsRecord } from "../../service/interfaces/settings.repository.js";

export function buildSettings(overrides: Partial<Settings> = {}): Settings {
    return {
        name: "test name",
        whatsappNumber: "6281200000000",
        address: "test address",
        latitude: -90,
        longitude: -180,
        deliveryFreeRadius: 1,
        deliveryMaxDistance: 10,
        deliveryPricePerKm: 5000,
        paymentTimeoutMinutes: 15,
        ...overrides,
    };
}

export function buildBusinessInfo(overrides: Partial<BusinessInfo> = {}): BusinessInfo {
    return {
        name: "test name",
        address: "test address",
        latitude: -90,
        longitude: -180,
        whatsappNumber: "6281200000000",
        ...overrides,
    };
}

export function buildSettingsRecord(overrides: Partial<SettingsRecord> = {}): SettingsRecord {
    return {
        name: "test name",
        whatsappNumber: "6281200000000",
        address: "test address",
        latitude: -7.9406,
        longitude: 112.6219,
        deliveryFreeRadius: 1,
        deliveryMaxDistance: 10,
        deliveryPricePerKm: 5000,
        paymentTimeoutMinutes: 15,
        updatedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
        ...overrides,
    };
}

import type { Settings, BusinessInfo } from "../../domain/settings.domain.js";

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

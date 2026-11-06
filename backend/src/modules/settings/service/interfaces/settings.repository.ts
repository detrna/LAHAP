export * from "../../domain/errors.js";

export interface SettingsChanges {
    readonly name: string;
    readonly whatsappNumber: string;
    readonly address: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly deliveryFreeRadius: number;
    readonly deliveryMaxDistance: number;
    readonly deliveryPricePerKm: number;
    readonly paymentTimeoutMinutes: number;
}

export interface SettingsRecord extends SettingsChanges {
    readonly updatedAt: Temporal.PlainDateTime;
}

export interface SettingsRepository {
    find(): Promise<SettingsRecord | null>;
    save(settings: SettingsChanges): Promise<SettingsRecord>;
}

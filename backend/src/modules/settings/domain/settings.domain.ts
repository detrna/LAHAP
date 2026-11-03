export interface Settings {
    readonly name: string;
    readonly whatsappNumber: string;
    readonly address: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly deliveryFreeRadius: number;
    readonly deliveryMaxDistance: number;
    readonly deliveryPricePerKm: number;
    readonly paymentTimeoutMinutes: number;
    readonly updatedAt?: string | undefined;
}

export interface BusinessInfo {
    readonly name: string;
    readonly address: string;
    readonly latitude: number;
    readonly longitude: number;
    readonly whatsappNumber: string;
}

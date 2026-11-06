import { roundHalfUp } from "../../../shared/utils/decimal/decimal.js";
import { getDistanceInKm, type Coordinates } from "../../../shared/utils/distance/distance.js";

const MONEY_SCALE = 2;

export interface DeliveryRates {
    readonly freeRadiusKm: number;
    readonly maxDistanceKm: number;
    readonly pricePerKm: number;
}

export interface DeliveryRateOverrides {
    readonly deliveryFreeRadius: number | null;
    readonly deliveryMaxDistance: number | null;
    readonly deliveryPricePerKm: number | null;
}

export interface DeliveryRateDefaults {
    readonly deliveryFreeRadius: number;
    readonly deliveryMaxDistance: number;
    readonly deliveryPricePerKm: number;
}

export interface DeliveryQuote {
    readonly distanceKm: number;
    readonly available: boolean;
    readonly feePerSlot: number;
}

export function resolveDeliveryRates(pkg: DeliveryRateOverrides, business: DeliveryRateDefaults): DeliveryRates {
    return {
        freeRadiusKm: pkg.deliveryFreeRadius ?? business.deliveryFreeRadius,
        maxDistanceKm: pkg.deliveryMaxDistance ?? business.deliveryMaxDistance,
        pricePerKm: pkg.deliveryPricePerKm ?? business.deliveryPricePerKm,
    };
}

export function quoteDelivery(kitchen: Coordinates, pin: Coordinates, rates: DeliveryRates): DeliveryQuote {
    const distanceKm = Math.ceil(getDistanceInKm(kitchen, pin));
    const billableKm = Math.max(0, distanceKm - rates.freeRadiusKm);
    return {
        distanceKm,
        available: distanceKm <= rates.maxDistanceKm,
        feePerSlot: roundHalfUp(billableKm * rates.pricePerKm, MONEY_SCALE),
    };
}

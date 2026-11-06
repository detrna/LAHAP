import { describe, expect, it } from "vitest";
import { quoteDelivery, resolveDeliveryRates, type DeliveryRates } from "./delivery-fee.js";

const KITCHEN = { lat: -7.9666, lng: 112.6326 };
const KM_PER_DEGREE_LAT = 111.19508;
const pinAt = (km: number) => ({ lat: KITCHEN.lat + km / KM_PER_DEGREE_LAT, lng: KITCHEN.lng });
const RATES: DeliveryRates = { freeRadiusKm: 3, maxDistanceKm: 10, pricePerKm: 2000 };

describe("resolveDeliveryRates", () => {
    const business = { deliveryFreeRadius: 3, deliveryMaxDistance: 10, deliveryPricePerKm: 2000 };

    it("uses the business defaults when the package has no overrides", () => {
        const pkg = { deliveryFreeRadius: null, deliveryMaxDistance: null, deliveryPricePerKm: null };
        expect(resolveDeliveryRates(pkg, business)).toEqual(RATES);
    });

    it("takes each override on its own", () => {
        const pkg = { deliveryFreeRadius: 0, deliveryMaxDistance: null, deliveryPricePerKm: 1500 };
        expect(resolveDeliveryRates(pkg, business)).toEqual({ freeRadiusKm: 0, maxDistanceKm: 10, pricePerKm: 1500 });
    });
});

describe("quoteDelivery", () => {
    it("is free at the kitchen", () => {
        expect(quoteDelivery(KITCHEN, KITCHEN, RATES)).toEqual({ distanceKm: 0, available: true, feePerSlot: 0 });
    });

    it("rounds the distance up to whole kilometres", () => {
        expect(quoteDelivery(KITCHEN, pinAt(3.2), RATES)).toEqual({ distanceKm: 4, available: true, feePerSlot: 2000 });
    });

    it("is free exactly at the free radius", () => {
        expect(quoteDelivery(KITCHEN, pinAt(2.99), RATES)).toEqual({ distanceKm: 3, available: true, feePerSlot: 0 });
    });

    it("charges only the kilometres past the free radius", () => {
        expect(quoteDelivery(KITCHEN, pinAt(6.5), RATES).feePerSlot).toBe(8000);
    });

    it("is available exactly at the max distance", () => {
        expect(quoteDelivery(KITCHEN, pinAt(9.99), RATES)).toEqual({
            distanceKm: 10,
            available: true,
            feePerSlot: 14000,
        });
    });

    it("is unavailable past the max distance", () => {
        expect(quoteDelivery(KITCHEN, pinAt(10.01), RATES).available).toBe(false);
    });

    it("rounds a fractional rate to the money scale", () => {
        const rates = { freeRadiusKm: 0, maxDistanceKm: 10, pricePerKm: 1000.555 };
        expect(quoteDelivery(KITCHEN, pinAt(0.5), rates).feePerSlot).toBe(1000.56);
    });
});

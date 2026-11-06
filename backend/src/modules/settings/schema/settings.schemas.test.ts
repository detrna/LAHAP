import { describe, expect, it } from "vitest";
import { settingsUpdateSchema } from "./settings.schemas.js";

const valid = {
    name: "Dapur Lahap Malang",
    whatsappNumber: "081234500000",
    address: "Jl. Soekarno Hatta No. 9",
    latitude: -7.9406,
    longitude: 112.6219,
    deliveryFreeRadius: 1,
    deliveryMaxDistance: 10,
    deliveryPricePerKm: 5000,
    paymentTimeoutMinutes: 15,
};

const parse = (overrides: Record<string, unknown>) => settingsUpdateSchema.safeParse({ ...valid, ...overrides });

describe("settingsUpdateSchema (unit)", () => {
    it("accepts a full body, trims text, normalizes the phone and ignores updatedAt", () => {
        const result = parse({ name: "  Dapur  ", address: " Jl. A ", updatedAt: "2020-01-01T00:00:00.000+07:00" });

        expect(result.success).toBe(true);
        expect(result.data).toEqual({
            ...valid,
            name: "Dapur",
            address: "Jl. A",
            whatsappNumber: "6281234500000",
        });
    });

    it("rounds money, distances and coordinates to the column scales", () => {
        const result = parse({
            latitude: -7.123456789,
            longitude: 112.987654321,
            deliveryFreeRadius: 1.005,
            deliveryMaxDistance: 10.004,
            deliveryPricePerKm: 5000.555,
        });

        expect(result.data).toMatchObject({
            latitude: -7.12345679,
            longitude: 112.98765432,
            deliveryFreeRadius: 1.01,
            deliveryMaxDistance: 10,
            deliveryPricePerKm: 5000.56,
        });
    });

    it.each([
        "name",
        "whatsappNumber",
        "address",
        "latitude",
        "longitude",
        "deliveryFreeRadius",
        "deliveryMaxDistance",
        "deliveryPricePerKm",
        "paymentTimeoutMinutes",
    ])("requires %s", field => {
        expect(parse({ [field]: undefined }).success).toBe(false);
    });

    it.each([
        ["an empty name", { name: "   " }],
        ["a name over 100 characters", { name: "a".repeat(101) }],
        ["an empty address", { address: " " }],
        ["a foreign phone number", { whatsappNumber: "+6591234567" }],
        ["a latitude below -90", { latitude: -90.1 }],
        ["a latitude above 90", { latitude: 90.1 }],
        ["a longitude below -180", { longitude: -180.1 }],
        ["a longitude above 180", { longitude: 180.1 }],
        ["a negative free radius", { deliveryFreeRadius: -1 }],
        ["a free radius above 999.99", { deliveryFreeRadius: 1000, deliveryMaxDistance: 999.99 }],
        ["a zero maximum distance", { deliveryFreeRadius: 0, deliveryMaxDistance: 0 }],
        ["a maximum distance above 999.99", { deliveryMaxDistance: 1000 }],
        ["a negative price per km", { deliveryPricePerKm: -1 }],
        ["a price per km above 99,999,999.99", { deliveryPricePerKm: 100000000 }],
        ["a zero payment timeout", { paymentTimeoutMinutes: 0 }],
        ["a payment timeout above 1440", { paymentTimeoutMinutes: 1441 }],
        ["a fractional payment timeout", { paymentTimeoutMinutes: 15.5 }],
        ["a string payment timeout", { paymentTimeoutMinutes: "15" }],
    ])("rejects %s", (_, overrides) => {
        expect(parse(overrides).success).toBe(false);
    });

    it("accepts the limits themselves", () => {
        const result = parse({
            latitude: 90,
            longitude: -180,
            deliveryFreeRadius: 0,
            deliveryMaxDistance: 999.99,
            deliveryPricePerKm: 0,
            paymentTimeoutMinutes: 1440,
        });

        expect(result.success).toBe(true);
    });

    it("rejects a free radius above the maximum distance", () => {
        const result = parse({ deliveryFreeRadius: 10.01, deliveryMaxDistance: 10 });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]).toMatchObject({ path: ["deliveryFreeRadius"] });
    });

    it("accepts a free radius equal to the maximum distance", () => {
        expect(parse({ deliveryFreeRadius: 10, deliveryMaxDistance: 10 }).success).toBe(true);
    });
});

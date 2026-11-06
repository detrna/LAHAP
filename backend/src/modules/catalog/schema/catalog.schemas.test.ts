import { describe, expect, it } from "vitest";
import {
    allergyCreateSchema,
    allergyListQuerySchema,
    allergyUpdateSchema,
    availablePackageListQuerySchema,
    packageCreateSchema,
    packageListQuerySchema,
    packageUpdateSchema,
} from "./catalog.schemas.js";

const validPackage = {
    name: "Diet Sehat",
    description: "Sehat",
    basePrice: 20000,
    periods: ["Harian", "Mingguan"],
    deliveryTimes: ["18:30", "07:00"],
    photoKey: "packages/2026/11/3f2b6c1e.webp",
};

describe("allergy schemas", () => {
    it("trims the name and requires 1 to 50 characters", () => {
        expect(allergyCreateSchema.parse({ name: "  Kacang " })).toEqual({ name: "Kacang" });
        expect(allergyCreateSchema.safeParse({ name: "   " }).success).toBe(false);
        expect(allergyCreateSchema.safeParse({}).success).toBe(false);
        expect(allergyCreateSchema.safeParse({ name: "a".repeat(51) }).success).toBe(false);
        expect(allergyCreateSchema.safeParse({ name: "a".repeat(50) }).success).toBe(true);
    });

    it("requires a name to update", () => {
        expect(allergyUpdateSchema.parse({ name: "Susu" })).toEqual({ name: "Susu" });
        expect(allergyUpdateSchema.safeParse({}).success).toBe(false);
    });

    it("reads page, limit and an optional search", () => {
        expect(allergyListQuerySchema.parse({ search: " ka ", page: "2", limit: "5" })).toEqual({
            search: "ka",
            page: 2,
            limit: 5,
        });
        expect(allergyListQuerySchema.parse({ search: "" }).search).toBeUndefined();
    });
});

describe("packageCreateSchema", () => {
    it("accepts the required fields", () => {
        const parsed = packageCreateSchema.parse(validPackage);

        expect(parsed.periods).toEqual(["Harian", "Mingguan"]);
        expect(parsed.deliveryTimes.map(time => time.toString({ smallestUnit: "minute" }))).toEqual(["18:30", "07:00"]);
        expect(parsed.isActive).toBeUndefined();
        expect(parsed.startAt).toBeUndefined();
    });

    it("parses the window to database timestamps and keeps null for no expiry", () => {
        const parsed = packageCreateSchema.parse({
            ...validPackage,
            startAt: "2026-11-10T07:00:00+07:00",
            endAt: null,
        });

        expect(parsed.startAt?.toString()).toBe("2026-11-10T00:00:00");
        expect(parsed.endAt).toBeNull();
    });

    it("accepts null delivery overrides and rounds them to two decimals", () => {
        const parsed = packageCreateSchema.parse({
            ...validPackage,
            deliveryFreeRadius: 2.555,
            deliveryMaxDistance: null,
            deliveryPricePerKm: 2500,
        });

        expect(parsed).toMatchObject({ deliveryFreeRadius: 2.56, deliveryMaxDistance: null, deliveryPricePerKm: 2500 });
    });

    it.each([
        ["a missing name", { name: undefined }],
        ["an empty name", { name: " " }],
        ["a zero price", { basePrice: 0 }],
        ["a negative price", { basePrice: -1 }],
        ["a price above the column", { basePrice: 10_000_000_000 }],
        ["no periods", { periods: [] }],
        ["an unknown period", { periods: ["Tahunan"] }],
        ["duplicate periods", { periods: ["Harian", "Harian"] }],
        ["no meal times", { deliveryTimes: [] }],
        ["a malformed meal time", { deliveryTimes: ["7:00"] }],
        ["duplicate meal times", { deliveryTimes: ["07:00", "07:00"] }],
        ["a radius above the column", { deliveryFreeRadius: 1000 }],
        ["a negative radius", { deliveryMaxDistance: -1 }],
        ["a price per km above the column", { deliveryPricePerKm: 100_000_000 }],
        ["a photo outside the packages folder", { photoKey: "menus/2026/11/a.webp" }],
        ["a start without an offset", { startAt: "2026-11-10T07:00:00" }],
    ])("rejects %s", (_, overrides) => {
        expect(packageCreateSchema.safeParse({ ...validPackage, ...overrides }).success).toBe(false);
    });
});

describe("packageUpdateSchema", () => {
    it("accepts a single field", () => {
        expect(packageUpdateSchema.parse({ isActive: false })).toEqual({ isActive: false });
    });

    it("accepts clearing the end and a delivery override", () => {
        expect(packageUpdateSchema.parse({ endAt: null, deliveryFreeRadius: null })).toEqual({
            endAt: null,
            deliveryFreeRadius: null,
        });
    });

    it("rejects an empty body, also after stripping unknown fields", () => {
        expect(packageUpdateSchema.safeParse({}).success).toBe(false);
        expect(packageUpdateSchema.safeParse({ unknown: 1 }).success).toBe(false);
    });

    it("applies the same limits as create", () => {
        expect(packageUpdateSchema.safeParse({ basePrice: 0 }).success).toBe(false);
        expect(packageUpdateSchema.safeParse({ deliveryTimes: [] }).success).toBe(false);
        expect(packageUpdateSchema.safeParse({ photoKey: "menus/a.webp" }).success).toBe(false);
    });
});

describe("package list queries", () => {
    it("reads isActive with the shared boolean parser", () => {
        expect(packageListQuerySchema.parse({ isActive: "false" }).isActive).toBe(false);
        expect(packageListQuerySchema.parse({ isActive: "true" }).isActive).toBe(true);
        expect(packageListQuerySchema.safeParse({ isActive: "maybe" }).success).toBe(false);
    });

    it("gives the public list only a search", () => {
        expect(availablePackageListQuerySchema.parse({ search: "diet", isActive: "false" })).toEqual({
            search: "diet",
            page: 1,
            limit: 20,
        });
    });
});

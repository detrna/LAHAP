import { describe, expect, it } from "vitest";
import {
    allergyCreateSchema,
    allergyListQuerySchema,
    allergyUpdateSchema,
    availablePackageListQuerySchema,
    menuCreateSchema,
    menuListQuerySchema,
    menuScheduleBatchCreateSchema,
    menuScheduleBatchDeleteSchema,
    menuScheduleBatchUpdateSchema,
    menuScheduleListQuerySchema,
    menuScheduleUpdateSchema,
    menuUpdateSchema,
    packageCreateSchema,
    packageListQuerySchema,
    packageScheduleQuerySchema,
    packageUpdateSchema,
    publishMenuSchedulesSchema,
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

const INGREDIENT_ID = "00000000-0000-4000-8000-000000000001";
const MENU_ID = "00000000-0000-4000-8000-000000000002";
const PACKAGE_ID = "00000000-0000-4000-8000-000000000003";

describe("packageUpdateSchema meal-time renames", () => {
    it("parses the changes", () => {
        const parsed = packageUpdateSchema.parse({
            deliveryTimeChanges: [{ from: "12:00", to: "12:30" }],
            changeReason: " jam baru ",
        });

        expect(parsed.deliveryTimeChanges?.[0]?.to.toString({ smallestUnit: "minute" })).toBe("12:30");
        expect(parsed.changeReason).toBe("jam baru");
    });

    it("refuses renames sent with deliveryTimes, or two renames of one time or onto one time", () => {
        const rename = { from: "12:00", to: "12:30" };
        expect(packageUpdateSchema.safeParse({ deliveryTimes: ["07:00"], deliveryTimeChanges: [rename] }).success).toBe(
            false,
        );
        expect(
            packageUpdateSchema.safeParse({ deliveryTimeChanges: [rename, { from: "12:00", to: "13:00" }] }).success,
        ).toBe(false);
        expect(
            packageUpdateSchema.safeParse({ deliveryTimeChanges: [rename, { from: "07:00", to: "12:30" }] }).success,
        ).toBe(false);
        expect(packageUpdateSchema.safeParse({ deliveryTimeChanges: [] }).success).toBe(false);
    });
});

describe("menu schemas", () => {
    const validMenu = {
        name: " Ayam Bakar ",
        description: "",
        photoKey: "menus/2026/11/3f2b6c1e.webp",
        ingredients: [{ ingredientId: INGREDIENT_ID, quantityPerPortion: 0.25 }],
    };

    it("accepts a menu and trims the name", () => {
        const parsed = menuCreateSchema.parse(validMenu);

        expect(parsed.name).toBe("Ayam Bakar");
        expect(parsed.isAlternative).toBeUndefined();
    });

    it("needs at least one ingredient line, each once, with a positive quantity", () => {
        expect(menuCreateSchema.safeParse({ ...validMenu, ingredients: [] }).success).toBe(false);
        expect(
            menuCreateSchema.safeParse({
                ...validMenu,
                ingredients: [...validMenu.ingredients, ...validMenu.ingredients],
            }).success,
        ).toBe(false);
        expect(
            menuCreateSchema.safeParse({
                ...validMenu,
                ingredients: [{ ingredientId: INGREDIENT_ID, quantityPerPortion: 0 }],
            }).success,
        ).toBe(false);
    });

    it("takes the photo from the menus folder only", () => {
        expect(menuCreateSchema.safeParse({ ...validMenu, photoKey: "packages/2026/11/x.webp" }).success).toBe(false);
    });

    it("needs a real change to update; a change reason alone is not one", () => {
        expect(menuUpdateSchema.safeParse({ changeReason: "x" }).success).toBe(false);
        expect(menuUpdateSchema.safeParse({}).success).toBe(false);
        expect(menuUpdateSchema.parse({ tags: [] })).toEqual({ tags: [] });
    });

    it("reads the list filters", () => {
        expect(menuListQuerySchema.parse({ isAlternative: "false" }).isAlternative).toBe(false);
    });
});

describe("menu schedule schemas", () => {
    const validItem = { packageId: PACKAGE_ID, date: "2026-11-10", deliveryTime: "07:00", primaryMenuId: MENU_ID };

    it("parses a batch of 1 to 100 schedules", () => {
        const parsed = menuScheduleBatchCreateSchema.parse({ items: [validItem] });

        expect(parsed.items[0]?.date.toString()).toBe("2026-11-10");
        expect(menuScheduleBatchCreateSchema.safeParse({ items: [] }).success).toBe(false);
        expect(menuScheduleBatchCreateSchema.safeParse({ items: Array(101).fill(validItem) }).success).toBe(false);
    });

    it("refuses an impossible date", () => {
        expect(menuScheduleBatchCreateSchema.safeParse({ items: [{ ...validItem, date: "2026-02-30" }] }).success).toBe(
            false,
        );
    });

    it("drops packageId from updates and keeps null to remove the alternative", () => {
        const parsed = menuScheduleUpdateSchema.parse({ packageId: PACKAGE_ID, alternativeMenuId: null });

        expect(parsed).toEqual({ alternativeMenuId: null });
        expect(menuScheduleUpdateSchema.safeParse({ packageId: PACKAGE_ID }).success).toBe(false);
    });

    it("needs unique ids and a change on each batch item", () => {
        const id = "00000000-0000-4000-8000-000000000009";
        expect(menuScheduleBatchUpdateSchema.safeParse({ items: [{ id, isPublished: true }] }).success).toBe(true);
        expect(menuScheduleBatchUpdateSchema.safeParse({ items: [{ id }] }).success).toBe(false);
        expect(
            menuScheduleBatchUpdateSchema.safeParse({
                items: [
                    { id, isPublished: true },
                    { id, isPublished: false },
                ],
            }).success,
        ).toBe(false);
        expect(menuScheduleBatchDeleteSchema.safeParse({ ids: [id, id] }).success).toBe(false);
    });

    it("publishes by ids or by package and range, defaulting to publish", () => {
        expect(publishMenuSchedulesSchema.parse({ ids: [MENU_ID] })).toEqual({ ids: [MENU_ID], publish: true });
        const range = publishMenuSchedulesSchema.parse({
            packageId: PACKAGE_ID,
            from: "2026-11-09",
            to: "2026-11-15",
            publish: false,
        });
        expect(range).toMatchObject({ packageId: PACKAGE_ID, publish: false });
        expect(publishMenuSchedulesSchema.safeParse({}).success).toBe(false);
        expect(publishMenuSchedulesSchema.safeParse({ ids: [MENU_ID], packageId: PACKAGE_ID }).success).toBe(false);
        expect(publishMenuSchedulesSchema.safeParse({ packageId: PACKAGE_ID, from: "2026-11-09" }).success).toBe(false);
        expect(
            publishMenuSchedulesSchema.safeParse({ packageId: PACKAGE_ID, from: "2026-11-15", to: "2026-11-09" })
                .success,
        ).toBe(false);
    });

    it("reads the list and public range filters", () => {
        expect(menuScheduleListQuerySchema.parse({ isPublished: "true", from: "2026-11-01" })).toMatchObject({
            isPublished: true,
        });
        expect(menuScheduleListQuerySchema.safeParse({ from: "2026-11-10", to: "2026-11-01" }).success).toBe(false);
        expect(packageScheduleQuerySchema.parse({}).from).toBeUndefined();
    });
});

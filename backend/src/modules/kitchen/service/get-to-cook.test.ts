import { describe, expect, it } from "vitest";
import { InvalidDateRangeError } from "../../../shared/time/date-range.js";
import {
    buildAllergy,
    buildMenu,
    buildPackage,
    buildScheduleSummary,
} from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildIngredient } from "../../ingredients/test-utils/factory/ingredients.factory.js";
import { buildCustomerAllergyProfile, buildKitchenSlot } from "../test-utils/factory/kitchen.factory.js";
import { setupKitchenService } from "../test-utils/setup/kitchen.setup.js";

const NOW = "2026-11-09T08:00:00+07:00[Asia/Jakarta]";

describe("KitchenService.getToCook (unit)", () => {
    describe("dates", () => {
        it("defaults to today, with the end the same as the start", async () => {
            const { service, catalog, clock } = setupKitchenService();
            clock.set(NOW);

            const reports = await service.getToCook({});

            expect(reports.map(report => report.date)).toEqual(["2026-11-09"]);
            expect(catalog.findSchedules).toHaveBeenCalledWith({
                from: Temporal.PlainDate.from("2026-11-09"),
                to: Temporal.PlainDate.from("2026-11-09"),
            });
        });

        it("answers one report per date of the range it is given", async () => {
            const { service } = setupKitchenService();

            const reports = await service.getToCook({
                from: Temporal.PlainDate.from("2026-11-09"),
                to: Temporal.PlainDate.from("2026-11-15"),
            });

            expect(reports).toHaveLength(7);
            expect(reports.at(-1)?.date).toBe("2026-11-15");
        });

        it("refuses a range of more than 7 days and one that ends before it starts", async () => {
            const { service, catalog } = setupKitchenService();

            await expect(
                service.getToCook({
                    from: Temporal.PlainDate.from("2026-11-09"),
                    to: Temporal.PlainDate.from("2026-11-16"),
                }),
            ).rejects.toBeInstanceOf(InvalidDateRangeError);
            await expect(
                service.getToCook({
                    from: Temporal.PlainDate.from("2026-11-09"),
                    to: Temporal.PlainDate.from("2026-11-08"),
                }),
            ).rejects.toBeInstanceOf(InvalidDateRangeError);
            expect(catalog.findSchedules).not.toHaveBeenCalled();
        });
    });

    describe("filters", () => {
        it("passes the package and the meal time on to the schedule search", async () => {
            const { service, catalog } = setupKitchenService();
            const from = Temporal.PlainDate.from("2026-11-09");
            const deliveryTime = Temporal.PlainTime.from("12:00");

            const [report] = await service.getToCook({ from, packageId: "p-1", deliveryTime });

            expect(catalog.findSchedules).toHaveBeenCalledWith({ from, to: from, packageId: "p-1", deliveryTime });
            expect(report?.deliveryTime).toEqual({ time: "12:00", range: "Siang" });
        });
    });

    describe("without anything to cook", () => {
        it("answers empty reports and asks no one else when no schedule is in range", async () => {
            const { service, slots, customers } = setupKitchenService();

            const [report] = await service.getToCook({ from: Temporal.PlainDate.from("2026-11-09") });

            expect(report).toEqual({
                date: "2026-11-09",
                deliveryTime: null,
                menus: [],
                ingredients: [],
                specialCategory: [],
            });
            expect(slots.listKitchenSlots).not.toHaveBeenCalled();
            expect(customers.getAllergyProfiles).not.toHaveBeenCalled();
        });

        it("answers empty reports and fetches no menu when no slot counts", async () => {
            const { service, catalog, slots, customers } = setupKitchenService();
            catalog.findSchedules.mockResolvedValue([buildScheduleSummary({ id: "s-1", date: "2026-11-09" })]);

            const [report] = await service.getToCook({ from: Temporal.PlainDate.from("2026-11-09") });

            expect(slots.listKitchenSlots).toHaveBeenCalledWith(["s-1"]);
            expect(report?.menus).toEqual([]);
            expect(catalog.getMenusByIds).not.toHaveBeenCalled();
            expect(catalog.getPackagesByIds).not.toHaveBeenCalled();
            expect(customers.getAllergyProfiles).not.toHaveBeenCalled();
        });
    });

    describe("with slots", () => {
        const peanut = buildAllergy({ id: "a-peanut", name: "Kacang" });
        const rice = buildIngredient({ id: "i-rice", name: "Beras", unit: "kg" });

        function setup() {
            const ctx = setupKitchenService();
            ctx.catalog.findSchedules.mockResolvedValue([
                buildScheduleSummary({
                    id: "s-1",
                    packageId: "p-1",
                    date: "2026-11-09",
                    deliveryTime: { time: "07:00", range: "Pagi" },
                    primaryMenuId: "m-1",
                    alternativeMenuId: "m-2",
                }),
                buildScheduleSummary({ id: "s-empty", packageId: "p-1", date: "2026-11-10", primaryMenuId: "m-3" }),
            ]);
            ctx.slots.listKitchenSlots.mockResolvedValue([
                buildKitchenSlot({ orderId: "o-1", menuScheduleId: "s-1", userId: "u-1", recipientName: "Bu Rina" }),
                buildKitchenSlot({ orderId: "o-2", menuScheduleId: "s-1", userId: "u-2", usesAlternativeMenu: true }),
                buildKitchenSlot({ orderId: "o-3", menuScheduleId: "s-1", userId: "u-1", recipientName: "Bu Rina" }),
            ]);
            ctx.catalog.getMenusByIds.mockResolvedValue([
                buildMenu({
                    id: "m-1",
                    name: "Ayam Bakar",
                    allergies: [peanut],
                    ingredients: [{ ingredientId: "i-rice", quantityPerPortion: 0.5, ingredient: rice }],
                }),
                buildMenu({ id: "m-2", name: "Tahu Bacem", isAlternative: true }),
            ]);
            ctx.catalog.getPackagesByIds.mockResolvedValue([buildPackage({ id: "p-1", name: "Diet Sehat" })]);
            ctx.customers.getAllergyProfiles.mockResolvedValue([
                buildCustomerAllergyProfile({ userId: "u-1", allergyIds: ["a-peanut"] }),
                buildCustomerAllergyProfile({ userId: "u-2" }),
            ]);
            return ctx;
        }

        const range = {
            from: Temporal.PlainDate.from("2026-11-09"),
            to: Temporal.PlainDate.from("2026-11-10"),
        };

        it("asks each provider once, for exactly what the slots need", async () => {
            const { service, catalog, slots, customers } = setup();

            await service.getToCook(range);

            expect(slots.listKitchenSlots).toHaveBeenCalledTimes(1);
            expect(slots.listKitchenSlots).toHaveBeenCalledWith(["s-1", "s-empty"]);
            expect(catalog.getMenusByIds).toHaveBeenCalledTimes(1);
            expect([...(catalog.getMenusByIds.mock.calls[0]?.[0] as string[])].sort()).toEqual(["m-1", "m-2"]);
            expect(catalog.getPackagesByIds).toHaveBeenCalledTimes(1);
            expect(catalog.getPackagesByIds).toHaveBeenCalledWith(["p-1"]);
            expect(customers.getAllergyProfiles).toHaveBeenCalledTimes(1);
            expect([...(customers.getAllergyProfiles.mock.calls[0]?.[0] as string[])].sort()).toEqual(["u-1", "u-2"]);
        });

        it("joins the pieces into one report per date", async () => {
            const { service } = setup();

            const reports = await service.getToCook(range);

            expect(reports.map(report => report.date)).toEqual(["2026-11-09", "2026-11-10"]);
            const [first, second] = reports;
            expect(
                first?.menus.map(({ menuId, isAlternative, portions }) => ({ menuId, isAlternative, portions })),
            ).toEqual([
                { menuId: "m-1", isAlternative: false, portions: 2 },
                { menuId: "m-2", isAlternative: true, portions: 1 },
            ]);
            expect(first?.ingredients).toEqual([
                { ingredientId: "i-rice", name: "Beras", unit: "kg", totalQuantity: 1 },
            ]);
            expect(first?.specialCategory.map(entry => [entry.orderId, entry.reasons])).toEqual([
                ["o-1", ["ALLERGY_CLASH"]],
                ["o-3", ["ALLERGY_CLASH"]],
            ]);
            expect(second).toMatchObject({ menus: [], ingredients: [], specialCategory: [] });
        });
    });
});

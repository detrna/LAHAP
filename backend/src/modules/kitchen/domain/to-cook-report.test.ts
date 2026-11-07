import { describe, expect, it } from "vitest";
import { buildAllergy, buildMenu } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildIngredient } from "../../ingredients/test-utils/factory/ingredients.factory.js";
import { buildCustomerAllergyProfile } from "../test-utils/factory/kitchen.factory.js";
import { buildServedSlot } from "../test-utils/served-slot.js";
import { buildToCookReports } from "./to-cook-report.js";

const rice = buildIngredient({ id: "i-rice", name: "Beras", unit: "kg" });
const peanut = buildAllergy({ id: "a-peanut", name: "Kacang" });

const lookups = {
    menus: new Map([
        [
            "m-1",
            buildMenu({
                id: "m-1",
                name: "Ayam Bakar",
                allergies: [peanut],
                ingredients: [{ ingredientId: "i-rice", quantityPerPortion: 0.5, ingredient: rice }],
            }),
        ],
    ]),
    packageNames: new Map([["p-1", "Diet Sehat"]]),
    profiles: new Map([["u-1", buildCustomerAllergyProfile({ userId: "u-1", allergyIds: ["a-peanut"] })]]),
};

function serve(date: string, orderId: string) {
    return buildServedSlot({
        schedule: {
            id: `s-${date}`,
            packageId: "p-1",
            date,
            deliveryTime: { time: "07:00", range: "Pagi" },
            primaryMenuId: "m-1",
            alternativeMenuId: null,
        },
        slot: { orderId, menuScheduleId: `s-${date}`, userId: "u-1" },
    });
}

const from = Temporal.PlainDate.from("2026-11-09");

describe("buildToCookReports (unit)", () => {
    it("gives one report per date, including dates with no slots", () => {
        const reports = buildToCookReports({
            from,
            to: Temporal.PlainDate.from("2026-11-11"),
            served: [serve("2026-11-10", "o-1")],
            lookups,
        });

        expect(reports.map(report => report.date)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11"]);
        expect(reports[0]).toEqual({
            date: "2026-11-09",
            deliveryTime: null,
            menus: [],
            ingredients: [],
            specialCategory: [],
        });
        expect(reports[2]?.menus).toEqual([]);
    });

    it("builds each report from the slots of its own date", () => {
        const reports = buildToCookReports({
            from,
            to: Temporal.PlainDate.from("2026-11-10"),
            served: [serve("2026-11-09", "o-1"), serve("2026-11-09", "o-2"), serve("2026-11-10", "o-3")],
            lookups,
        });

        expect(reports.map(report => report.menus.map(menu => menu.portions))).toEqual([[2], [1]]);
        expect(reports.map(report => report.ingredients.map(item => item.totalQuantity))).toEqual([[1], [0.5]]);
        expect(reports.map(report => report.specialCategory.map(entry => entry.orderId))).toEqual([
            ["o-1", "o-2"],
            ["o-3"],
        ]);
    });

    it("echoes the meal-time filter as a view, or null when there is none", () => {
        const withTime = buildToCookReports({
            from,
            to: from,
            deliveryTime: Temporal.PlainTime.from("12:00"),
            served: [],
            lookups,
        });
        const withoutTime = buildToCookReports({ from, to: from, served: [], lookups });

        expect(withTime[0]?.deliveryTime).toEqual({ time: "12:00", range: "Siang" });
        expect(withoutTime[0]?.deliveryTime).toBeNull();
    });

    it("ignores slots outside the dates asked for", () => {
        const reports = buildToCookReports({ from, to: from, served: [serve("2026-11-20", "o-1")], lookups });

        expect(reports).toHaveLength(1);
        expect(reports[0]?.menus).toEqual([]);
    });
});

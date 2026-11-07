import { describe, expect, it } from "vitest";
import { buildMenu } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildServedSlot } from "../test-utils/served-slot.js";
import { buildToCookMenus } from "./to-cook-menus.js";

const morning = { time: "07:00", range: "Pagi" } as const;
const noon = { time: "12:00", range: "Siang" } as const;

const menus = new Map([
    ["m-1", buildMenu({ id: "m-1", name: "Ayam Bakar" })],
    ["m-2", buildMenu({ id: "m-2", name: "Tahu Bacem", isAlternative: true })],
    ["m-3", buildMenu({ id: "m-3", name: "Soto" })],
]);
const packageNames = new Map([
    ["p-1", "Diet Sehat"],
    ["p-2", "Paket Hemat"],
]);

function serve(
    scheduleId: string,
    options: {
        packageId?: string;
        deliveryTime?: typeof morning | typeof noon;
        primary?: string;
        alternative?: string | null;
        alt?: boolean;
    } = {},
) {
    return buildServedSlot({
        schedule: {
            id: scheduleId,
            packageId: options.packageId ?? "p-1",
            deliveryTime: options.deliveryTime ?? morning,
            primaryMenuId: options.primary ?? "m-1",
            alternativeMenuId: options.alternative === undefined ? "m-2" : options.alternative,
        },
        slot: { menuScheduleId: scheduleId, usesAlternativeMenu: options.alt ?? false },
    });
}

describe("buildToCookMenus (unit)", () => {
    it("counts one portion for each served slot of a menu", () => {
        const result = buildToCookMenus([serve("s-1"), serve("s-1"), serve("s-1")], { menus, packageNames });

        expect(result).toEqual([
            {
                packageId: "p-1",
                packageName: "Diet Sehat",
                menuId: "m-1",
                name: "Ayam Bakar",
                isAlternative: false,
                deliveryTime: morning,
                portions: 3,
            },
        ]);
    });

    it("keeps primary and alternative portions on separate lines, primary first", () => {
        const result = buildToCookMenus([serve("s-1", { alt: true }), serve("s-1"), serve("s-1")], {
            menus,
            packageNames,
        });

        expect(result.map(({ menuId, isAlternative, portions }) => ({ menuId, isAlternative, portions }))).toEqual([
            { menuId: "m-1", isAlternative: false, portions: 2 },
            { menuId: "m-2", isAlternative: true, portions: 1 },
        ]);
    });

    it("gives no line to an alternative menu nobody uses", () => {
        const result = buildToCookMenus([serve("s-1")], { menus, packageNames });

        expect(result.map(line => line.menuId)).toEqual(["m-1"]);
    });

    it("separates meal times and packages and sorts by time, then package name", () => {
        const result = buildToCookMenus(
            [
                serve("s-noon", { deliveryTime: noon }),
                serve("s-hemat", { packageId: "p-2", primary: "m-3" }),
                serve("s-diet"),
            ],
            { menus, packageNames },
        );

        expect(result.map(line => [line.deliveryTime.time, line.packageName, line.menuId])).toEqual([
            ["07:00", "Diet Sehat", "m-1"],
            ["07:00", "Paket Hemat", "m-3"],
            ["12:00", "Diet Sehat", "m-1"],
        ]);
    });

    it("adds up slots of different schedules that serve the same menu at the same time", () => {
        const result = buildToCookMenus([serve("s-1"), serve("s-2")], { menus, packageNames });

        expect(result).toHaveLength(1);
        expect(result[0]?.portions).toBe(2);
    });

    it("skips a line whose menu or package is unknown", () => {
        const result = buildToCookMenus(
            [serve("s-1", { primary: "m-unknown" }), serve("s-2", { packageId: "p-unknown" }), serve("s-3")],
            { menus, packageNames },
        );

        expect(result.map(line => line.menuId)).toEqual(["m-1"]);
    });

    it("answers an empty list when nothing is served", () => {
        expect(buildToCookMenus([], { menus, packageNames })).toEqual([]);
    });
});

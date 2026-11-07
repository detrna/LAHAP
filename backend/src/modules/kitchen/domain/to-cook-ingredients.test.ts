import { describe, expect, it } from "vitest";
import { buildMenu } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildIngredient } from "../../ingredients/test-utils/factory/ingredients.factory.js";
import { buildServedSlot } from "../test-utils/served-slot.js";
import { buildToCookIngredients } from "./to-cook-ingredients.js";

const chicken = buildIngredient({ id: "i-chicken", name: "Dada Ayam", unit: "kg" });
const rice = buildIngredient({ id: "i-rice", name: "Beras", unit: "kg" });
const egg = buildIngredient({ id: "i-egg", name: "Telur", unit: "butir" });

function line(ingredient: typeof chicken, quantityPerPortion: number) {
    return { ingredientId: ingredient.id, quantityPerPortion, ingredient };
}

const menus = new Map([
    ["m-1", buildMenu({ id: "m-1", ingredients: [line(chicken, 0.2), line(rice, 0.1)] })],
    ["m-2", buildMenu({ id: "m-2", isAlternative: true, ingredients: [line(egg, 1), line(rice, 0.15)] })],
    ["m-3", buildMenu({ id: "m-3", ingredients: [line(rice, 0.375)] })],
]);

function serve(scheduleId: string, options: { primary?: string; alt?: boolean } = {}) {
    return buildServedSlot({
        schedule: { id: scheduleId, primaryMenuId: options.primary ?? "m-1", alternativeMenuId: "m-2" },
        slot: { menuScheduleId: scheduleId, usesAlternativeMenu: options.alt ?? false },
    });
}

describe("buildToCookIngredients (unit)", () => {
    it("multiplies the portions of a menu by each recipe line", () => {
        const result = buildToCookIngredients([serve("s-1"), serve("s-1"), serve("s-1")], menus);

        expect(result).toEqual([
            { ingredientId: "i-rice", name: "Beras", unit: "kg", totalQuantity: 0.3 },
            { ingredientId: "i-chicken", name: "Dada Ayam", unit: "kg", totalQuantity: 0.6 },
        ]);
    });

    it("adds up one ingredient across the primary and alternative menus", () => {
        const result = buildToCookIngredients([serve("s-1"), serve("s-1"), serve("s-1", { alt: true })], menus);

        const totals = Object.fromEntries(result.map(item => [item.ingredientId, item.totalQuantity]));
        expect(totals).toEqual({ "i-chicken": 0.4, "i-rice": 0.35, "i-egg": 1 });
    });

    it("adds up one menu served by different schedules", () => {
        const result = buildToCookIngredients([serve("s-1"), serve("s-2")], menus);

        expect(result.find(item => item.ingredientId === "i-chicken")?.totalQuantity).toBe(0.4);
    });

    it("rounds a total half up to two decimals", () => {
        const result = buildToCookIngredients([serve("s-1", { primary: "m-3" })], menus);

        expect(result).toEqual([{ ingredientId: "i-rice", name: "Beras", unit: "kg", totalQuantity: 0.38 }]);
    });

    it("sorts the ingredients by name", () => {
        const result = buildToCookIngredients([serve("s-1", { alt: true })], menus);

        expect(result.map(item => item.name)).toEqual(["Beras", "Telur"]);
    });

    it("skips a recipe line whose ingredient data is missing and a menu that is unknown", () => {
        const partial = new Map([
            [
                "m-1",
                buildMenu({
                    id: "m-1",
                    ingredients: [line(chicken, 0.2), { ingredientId: "i-gone", quantityPerPortion: 1 }],
                }),
            ],
        ]);

        const result = buildToCookIngredients([serve("s-1"), serve("s-2", { primary: "m-unknown" })], partial);

        expect(result.map(item => item.ingredientId)).toEqual(["i-chicken"]);
    });

    it("answers an empty list when nothing is served", () => {
        expect(buildToCookIngredients([], menus)).toEqual([]);
    });
});

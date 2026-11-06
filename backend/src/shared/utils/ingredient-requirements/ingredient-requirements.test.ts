import { describe, expect, it } from "vitest";
import { sumIngredientRequirements } from "./ingredient-requirements.js";

describe("sumIngredientRequirements (unit)", () => {
    it("multiplies the portions of a menu by each recipe line", () => {
        const result = sumIngredientRequirements(new Map([["m-1", 10]]), [
            { menuId: "m-1", ingredientId: "i-1", quantityPerPortion: 0.15 },
            { menuId: "m-1", ingredientId: "i-2", quantityPerPortion: 2 },
        ]);

        expect(result).toEqual(
            new Map([
                ["i-1", 1.5],
                ["i-2", 20],
            ]),
        );
    });

    it("adds the primary and alternative menus that share an ingredient", () => {
        const result = sumIngredientRequirements(
            new Map([
                ["primary", 8],
                ["alternative", 2],
            ]),
            [
                { menuId: "primary", ingredientId: "rice", quantityPerPortion: 0.1 },
                { menuId: "alternative", ingredientId: "rice", quantityPerPortion: 0.1 },
                { menuId: "alternative", ingredientId: "tofu", quantityPerPortion: 0.25 },
            ],
        );

        expect(result).toEqual(
            new Map([
                ["rice", 1],
                ["tofu", 0.5],
            ]),
        );
    });

    it("rounds each total half up to two decimals without float noise", () => {
        const result = sumIngredientRequirements(new Map([["m-1", 3]]), [
            { menuId: "m-1", ingredientId: "i-1", quantityPerPortion: 0.335 },
            { menuId: "m-1", ingredientId: "i-2", quantityPerPortion: 0.1 },
        ]);

        expect(result.get("i-1")).toBe(1.01);
        expect(result.get("i-2")).toBe(0.3);
    });

    it("ignores recipe lines of menus with no portions", () => {
        const result = sumIngredientRequirements(new Map([["m-1", 4]]), [
            { menuId: "m-2", ingredientId: "i-1", quantityPerPortion: 1 },
        ]);

        expect(result.size).toBe(0);
    });

    it("answers an empty map for no portions or no lines", () => {
        expect(sumIngredientRequirements(new Map(), []).size).toBe(0);
    });
});

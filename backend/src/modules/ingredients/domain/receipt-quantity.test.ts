import { describe, expect, it } from "vitest";
import { toIngredientQuantity } from "./receipt-quantity.js";

describe("toIngredientQuantity (unit)", () => {
    it.each([
        [2, "kg", "kg", 2],
        [1, "kg", "gram", 1000],
        [500, "gr", "kg", 0.5],
        [500, "g", "kg", 0.5],
        [250, "grm", "kg", 0.25],
        [2, "kilo", "gram", 2000],
        [1.5, "Kg.", "gram", 1500],
        [1, "L", "ml", 1000],
        [600, "ml", "liter", 0.6],
        [2, "ltr", "liter", 2],
        [250, "cc", "liter", 0.25],
        [30, "btr", "butir", 30],
        [3, "IKT", "ikat", 3],
    ] as const)("reads %s %s as an amount in %s", (quantity, printedUnit, ingredientUnit, expected) => {
        expect(toIngredientQuantity(quantity, printedUnit, ingredientUnit)).toBeCloseTo(expected, 10);
    });

    it("reads a quantity without a printed unit in the ingredient's own unit", () => {
        expect(toIngredientQuantity(3, "", "ikat")).toBe(3);
        expect(toIngredientQuantity(3, "  ", "kg")).toBe(3);
    });

    it.each([
        [1, "pcs", "kg"],
        [1, "pack", "gram"],
        [1, "kg", "liter"],
        [1, "liter", "gram"],
        [1, "kg", "butir"],
        [10, "butir", "ikat"],
        [1, "constructor", "kg"],
    ] as const)("refuses %s %s for an ingredient in %s", (quantity, printedUnit, ingredientUnit) => {
        expect(toIngredientQuantity(quantity, printedUnit, ingredientUnit)).toBeNull();
    });
});

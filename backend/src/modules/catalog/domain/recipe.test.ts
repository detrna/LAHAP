import { describe, expect, it } from "vitest";
import { isSameRecipe } from "./recipe.js";

const line = (ingredientId: string, quantityPerPortion: number) => ({ ingredientId, quantityPerPortion });

describe("isSameRecipe (unit)", () => {
    it("treats the same lines in another order as the same recipe", () => {
        expect(isSameRecipe([line("a", 1), line("b", 2)], [line("b", 2), line("a", 1)])).toBe(true);
    });

    it("sees a changed quantity", () => {
        expect(isSameRecipe([line("a", 1)], [line("a", 1.5)])).toBe(false);
    });

    it("sees an added or swapped ingredient", () => {
        expect(isSameRecipe([line("a", 1)], [line("a", 1), line("b", 1)])).toBe(false);
        expect(isSameRecipe([line("a", 1)], [line("b", 1)])).toBe(false);
    });
});

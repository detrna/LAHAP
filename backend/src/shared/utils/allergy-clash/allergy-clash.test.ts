import { describe, expect, it } from "vitest";
import { findClashingAllergies } from "./allergy-clash.js";

const egg = { id: "egg", name: "Telur" };
const nuts = { id: "nuts", name: "Kacang" };

describe("findClashingAllergies", () => {
    it("returns the menu allergens the user has", () => {
        expect(findClashingAllergies(["nuts", "milk"], [egg, nuts])).toEqual([nuts]);
    });

    it("is empty without an intersection", () => {
        expect(findClashingAllergies(["milk"], [egg, nuts])).toEqual([]);
        expect(findClashingAllergies([], [egg, nuts])).toEqual([]);
        expect(findClashingAllergies(["egg"], [])).toEqual([]);
    });
});

import { describe, expect, it } from "vitest";
import { buildAllergy } from "../test-utils/factory/catalog.factory.js";
import { unionAllergies } from "./menu-allergies.js";

describe("unionAllergies (unit)", () => {
    it("merges the ingredients' allergies once each, sorted by name", () => {
        const egg = buildAllergy({ id: "a-telur", name: "Telur" });
        const peanut = buildAllergy({ id: "a-kacang", name: "Kacang" });
        const milk = buildAllergy({ id: "a-susu", name: "Susu" });

        const result = unionAllergies([{ allergies: [egg, peanut] }, { allergies: [peanut, milk] }, {}]);

        expect(result.map(allergy => allergy.name)).toEqual(["Kacang", "Susu", "Telur"]);
    });

    it("returns an empty list when no ingredient has allergies", () => {
        expect(unionAllergies([{ allergies: [] }, {}])).toEqual([]);
    });
});

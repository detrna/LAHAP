import { describe, expect, it } from "vitest";
import { buildAllergy } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { toIngredient } from "./to-ingredient.js";

describe("toIngredient", () => {
    it("renders timestamps in Asia/Jakarta and carries the url and allergies", () => {
        const allergies = [buildAllergy()];

        const item = toIngredient(buildIngredientRecord({ stock: 12 }), {
            photoUrl: "https://storage.test/p",
            allergies,
        });

        expect(item).toMatchObject({
            id: "00000000-0000-4000-8000-000000000001",
            stock: 12,
            photoUrl: "https://storage.test/p",
            createdAt: "2026-11-03T08:00:00.000+07:00",
            allergies,
        });
    });

    it("derives isLowStock from stock and threshold", () => {
        const context = { photoUrl: "u", allergies: [] };

        expect(toIngredient(buildIngredientRecord({ stock: 10, minimumThreshold: 10 }), context).isLowStock).toBe(true);
        expect(toIngredient(buildIngredientRecord({ stock: 11, minimumThreshold: 10 }), context).isLowStock).toBe(
            false,
        );
    });
});

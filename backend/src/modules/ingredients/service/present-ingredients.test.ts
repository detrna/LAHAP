import { describe, expect, it } from "vitest";
import { buildAllergy } from "../../catalog/test-utils/factory/catalog.factory.js";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";

const ALLERGY_A = buildAllergy({ id: "a-1", name: "Kacang" });
const ALLERGY_B = buildAllergy({ id: "a-2", name: "Telur" });

describe("IngredientsService.presentIngredients (unit)", () => {
    it("returns an empty list without calling anything", async () => {
        const { allergies, objectStorage, service } = setupIngredientsService();

        expect(await service.presentIngredients([])).toEqual([]);
        expect(allergies.getAllergiesByIds).not.toHaveBeenCalled();
        expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
    });

    it("asks for the allergies of the whole page once and gives each ingredient its own", async () => {
        const { allergies, service } = setupIngredientsService();
        allergies.getAllergiesByIds.mockResolvedValue([ALLERGY_A, ALLERGY_B]);

        const items = await service.presentIngredients([
            buildIngredientRecord({ id: "i-1", allergyIds: ["a-1", "a-2"] }),
            buildIngredientRecord({ id: "i-2", allergyIds: ["a-2"] }),
            buildIngredientRecord({ id: "i-3", allergyIds: [] }),
        ]);

        expect(allergies.getAllergiesByIds).toHaveBeenCalledTimes(1);
        expect(allergies.getAllergiesByIds).toHaveBeenCalledWith(["a-1", "a-2"]);
        expect(items.map(item => item.allergies?.map(allergy => allergy.id))).toEqual([["a-1", "a-2"], ["a-2"], []]);
    });

    it("signs each distinct photo key once", async () => {
        const { objectStorage, service } = setupIngredientsService();

        const items = await service.presentIngredients([
            buildIngredientRecord({ id: "i-1", photoKey: "ingredients/2026/11/a.webp" }),
            buildIngredientRecord({ id: "i-2", photoKey: "ingredients/2026/11/a.webp" }),
            buildIngredientRecord({ id: "i-3", photoKey: "ingredients/2026/11/b.webp" }),
        ]);

        expect(objectStorage.getSignedUrl).toHaveBeenCalledTimes(2);
        expect(items.map(item => item.photoUrl)).toEqual([
            "https://storage.test/ingredients/2026/11/a.webp?signed",
            "https://storage.test/ingredients/2026/11/a.webp?signed",
            "https://storage.test/ingredients/2026/11/b.webp?signed",
        ]);
    });
});

import { describe, expect, it } from "vitest";
import { buildIngredient } from "../../../ingredients/test-utils/factory/ingredients.factory.js";
import { buildAllergy, buildMenuRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.presentMenus (unit)", () => {
    const egg = buildAllergy({ id: "a-telur", name: "Telur" });
    const peanut = buildAllergy({ id: "a-kacang", name: "Kacang" });

    function setup() {
        const context = setupCatalogService();
        context.ingredients.getIngredientsByIds.mockResolvedValue([
            buildIngredient({ id: "i-1", allergies: [egg] }),
            buildIngredient({ id: "i-2", allergies: [peanut, egg] }),
        ]);
        return context;
    }

    it("joins every menu's ingredients from one lookup and derives the allergies", async () => {
        const { ingredients, service } = setup();
        const records = [
            buildMenuRecord({ id: "m-1", ingredients: [{ ingredientId: "i-1", quantityPerPortion: 0.5 }] }),
            buildMenuRecord({
                id: "m-2",
                ingredients: [
                    { ingredientId: "i-1", quantityPerPortion: 1 },
                    { ingredientId: "i-2", quantityPerPortion: 2 },
                ],
            }),
        ];

        const [first, second] = await service.presentMenus(records, { withIngredients: true });

        expect(ingredients.getIngredientsByIds).toHaveBeenCalledTimes(1);
        expect(ingredients.getIngredientsByIds).toHaveBeenCalledWith(["i-1", "i-2"]);
        expect(first?.allergies?.map(allergy => allergy.name)).toEqual(["Telur"]);
        expect(second?.allergies?.map(allergy => allergy.name)).toEqual(["Kacang", "Telur"]);
        expect(second?.ingredients?.[1]).toMatchObject({ ingredientId: "i-2", quantityPerPortion: 2 });
        expect(second?.ingredients?.[1]?.ingredient?.id).toBe("i-2");
        expect(first?.photoUrl).toBe("https://storage.test/menus/2026/11/3f2b6c1e.webp?signed");
        expect(first?.createdAt).toBe("2026-11-01T07:00:00.000+07:00");
    });

    it("leaves the recipe lines out when asked, keeping the allergies", async () => {
        const { service } = setup();

        const [menu] = await service.presentMenus(
            [buildMenuRecord({ ingredients: [{ ingredientId: "i-2", quantityPerPortion: 1 }] })],
            { withIngredients: false },
        );

        expect(menu?.ingredients).toBeUndefined();
        expect(menu?.allergies?.map(allergy => allergy.name)).toEqual(["Kacang", "Telur"]);
    });

    it("does nothing for an empty list", async () => {
        const { ingredients, service } = setup();

        expect(await service.presentMenus([], { withIngredients: true })).toEqual([]);
        expect(ingredients.getIngredientsByIds).not.toHaveBeenCalled();
    });
});

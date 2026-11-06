import { describe, expect, it } from "vitest";
import { buildMenuRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";
import { UnknownIngredientError } from "../interfaces/catalog.repository.js";

const INPUT = {
    name: "Ayam Bakar",
    description: "",
    photoKey: "menus/2026/11/new.webp",
    ingredients: [{ ingredientId: "i-1", quantityPerPortion: 0.25 }],
};

describe("CatalogService.createMenu (unit)", () => {
    it("checks the ingredients and photo, then creates with defaults", async () => {
        const { repository, ingredients, photoKeys, service } = setupCatalogService();
        repository.createMenu.mockResolvedValue(buildMenuRecord({ id: "m-1" }));

        const menu = await service.createMenu(INPUT);

        expect(ingredients.findMissingIngredientIds).toHaveBeenCalledWith(["i-1"]);
        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("menus/2026/11/new.webp");
        expect(repository.createMenu).toHaveBeenCalledWith({ ...INPUT, isAlternative: false, tags: [] });
        expect(menu.id).toBe("m-1");
    });

    it("throws UnknownIngredientError for ingredients that don't exist", async () => {
        const { repository, ingredients, service } = setupCatalogService();
        ingredients.findMissingIngredientIds.mockResolvedValue(["i-1"]);

        await expect(service.createMenu(INPUT)).rejects.toBeInstanceOf(UnknownIngredientError);
        expect(repository.createMenu).not.toHaveBeenCalled();
    });
});

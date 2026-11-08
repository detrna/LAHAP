import { describe, expect, it } from "vitest";
import { InvalidStateError } from "../../../../shared/errors/invalid-state-error.js";
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
        const { repository, ingredients, photoKeys, cooks, service } = setupCatalogService();
        repository.createMenu.mockResolvedValue(buildMenuRecord({ id: "m-1" }));

        const menu = await service.createMenu(INPUT);

        expect(ingredients.findMissingIngredientIds).toHaveBeenCalledWith(["i-1"]);
        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("menus/2026/11/new.webp");
        expect(cooks.filterActiveUserIds).not.toHaveBeenCalled();
        expect(repository.createMenu).toHaveBeenCalledWith({
            ...INPUT,
            isAlternative: false,
            tags: [],
            components: [],
        });
        expect(menu.id).toBe("m-1");
    });

    it("throws UnknownIngredientError for ingredients that don't exist", async () => {
        const { repository, ingredients, service } = setupCatalogService();
        ingredients.findMissingIngredientIds.mockResolvedValue(["i-1"]);

        await expect(service.createMenu(INPUT)).rejects.toBeInstanceOf(UnknownIngredientError);
        expect(repository.createMenu).not.toHaveBeenCalled();
    });

    describe("components", () => {
        const components = [
            { name: "Nasi Putih" },
            { name: "Ayam Bakar", cookId: "c-1" },
            { name: "Tumis Buncis", cookId: "c-1" },
            { name: "Sambal", cookId: null },
        ];

        it("checks each distinct cook once as an active KITCHEN user and stores null for a missing cook", async () => {
            const { repository, cooks, service } = setupCatalogService();
            repository.createMenu.mockResolvedValue(buildMenuRecord());

            await service.createMenu({ ...INPUT, components });

            expect(cooks.filterActiveUserIds).toHaveBeenCalledTimes(1);
            expect(cooks.filterActiveUserIds).toHaveBeenCalledWith(["c-1"], "KITCHEN");
            expect(repository.createMenu).toHaveBeenCalledWith(
                expect.objectContaining({
                    components: [
                        { name: "Nasi Putih", cookId: null },
                        { name: "Ayam Bakar", cookId: "c-1" },
                        { name: "Tumis Buncis", cookId: "c-1" },
                        { name: "Sambal", cookId: null },
                    ],
                }),
            );
        });

        it("gives 422 when a cook is not an active kitchen staff, writing nothing", async () => {
            const { repository, cooks, photoKeys, service } = setupCatalogService();
            cooks.filterActiveUserIds.mockResolvedValue([]);

            await expect(service.createMenu({ ...INPUT, components })).rejects.toThrow(
                new InvalidStateError("cook is not an active kitchen staff"),
            );
            expect(photoKeys.assertPhotoKeyExists).not.toHaveBeenCalled();
            expect(repository.createMenu).not.toHaveBeenCalled();
        });

        it("doesn't look cooks up when no component has one", async () => {
            const { repository, cooks, service } = setupCatalogService();
            repository.createMenu.mockResolvedValue(buildMenuRecord());

            await service.createMenu({ ...INPUT, components: [{ name: "Nasi Putih" }] });

            expect(cooks.filterActiveUserIds).not.toHaveBeenCalled();
        });
    });
});

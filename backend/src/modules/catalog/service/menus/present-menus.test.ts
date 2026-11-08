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
        const { ingredients, cooks, service } = setup();

        expect(await service.presentMenus([], { withIngredients: true })).toEqual([]);
        expect(ingredients.getIngredientsByIds).not.toHaveBeenCalled();
        expect(cooks.getSummaries).not.toHaveBeenCalled();
    });

    describe("components", () => {
        const siti = { id: "c-1", name: "Siti", phone: "628120000001", role: "KITCHEN" } as const;
        const budi = { id: "c-2", name: "Budi", phone: "628120000002", role: "KITCHEN" } as const;

        it("hydrates every cook from one lookup across all menus, with null for no or an unknown cook", async () => {
            const { cooks, service } = setup();
            cooks.getSummaries.mockResolvedValue([siti, budi]);
            const records = [
                buildMenuRecord({
                    id: "m-1",
                    components: [
                        { id: "k-1", name: "Ayam Bakar", cookId: "c-1" },
                        { id: "k-2", name: "Nasi Putih", cookId: null },
                    ],
                }),
                buildMenuRecord({
                    id: "m-2",
                    components: [
                        { id: "k-3", name: "Sayur", cookId: "c-2" },
                        { id: "k-4", name: "Sambal", cookId: "c-1" },
                        { id: "k-5", name: "Kerupuk", cookId: "c-gone" },
                    ],
                }),
            ];

            const [first, second] = await service.presentMenus(records, { withIngredients: false });

            expect(cooks.getSummaries).toHaveBeenCalledTimes(1);
            expect(cooks.getSummaries).toHaveBeenCalledWith(["c-1", "c-2", "c-gone"]);
            expect(first?.components).toEqual([
                { id: "k-1", name: "Ayam Bakar", cookId: "c-1", cook: siti },
                { id: "k-2", name: "Nasi Putih", cookId: null, cook: null },
            ]);
            expect(second?.components.map(component => component.cook)).toEqual([budi, siti, null]);
        });

        it("keeps the stored order and skips the cook lookup when no component has a cook", async () => {
            const { cooks, service } = setup();

            const [menu] = await service.presentMenus(
                [
                    buildMenuRecord({
                        components: [
                            { id: "k-1", name: "Ayam Bakar", cookId: null },
                            { id: "k-2", name: "Nasi Putih", cookId: null },
                        ],
                    }),
                ],
                { withIngredients: true },
            );

            expect(cooks.getSummaries).not.toHaveBeenCalled();
            expect(menu?.components.map(component => component.name)).toEqual(["Ayam Bakar", "Nasi Putih"]);
        });

        it("answers an empty list for a menu without components", async () => {
            const { service } = setup();

            const [menu] = await service.presentMenus([buildMenuRecord()], { withIngredients: false });

            expect(menu?.components).toEqual([]);
        });
    });
});

import { describe, expect, it } from "vitest";
import { buildMenuRecord } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.getMenusByIds (unit)", () => {
    it("reads each id once", async () => {
        const { repository, service } = setupCatalogService();
        repository.findMenusByIds.mockResolvedValue([buildMenuRecord({ id: "m-1" })]);

        const menus = await service.getMenusByIds(["m-1", "m-1"]);

        expect(repository.findMenusByIds).toHaveBeenCalledWith(["m-1"]);
        expect(menus.map(menu => menu.id)).toEqual(["m-1"]);
    });

    it("skips the repository for no ids", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.getMenusByIds([])).toEqual([]);
        expect(repository.findMenusByIds).not.toHaveBeenCalled();
    });

    describe("audience", () => {
        const record = buildMenuRecord({
            id: "m-1",
            ingredients: [{ ingredientId: "i-1", quantityPerPortion: 1 }],
            components: [{ id: "k-1", name: "Ayam Bakar", cookId: "c-1" }],
        });
        const siti = { id: "c-1", name: "Siti", phone: "628120000001", role: "KITCHEN" } as const;

        it("gives the customer view by default: no recipe lines and no cooks", async () => {
            const { repository, ingredients, cooks, service } = setupCatalogService();
            repository.findMenusByIds.mockResolvedValue([record]);

            const [menu] = await service.getMenusByIds(["m-1"]);

            expect(ingredients.getIngredientsByIds).not.toHaveBeenCalled();
            expect(cooks.getSummaries).not.toHaveBeenCalled();
            expect(menu).not.toHaveProperty("ingredients");
            expect(menu?.components).toEqual([{ id: "k-1", name: "Ayam Bakar" }]);
        });

        it("gives staff the recipe lines and each cook's id and name", async () => {
            const { repository, cooks, service } = setupCatalogService();
            repository.findMenusByIds.mockResolvedValue([record]);
            cooks.getSummaries.mockResolvedValue([siti]);

            const [menu] = await service.getMenusByIds(["m-1"], { audience: "staff" });

            expect(menu?.ingredients).toEqual([{ ingredientId: "i-1", quantityPerPortion: 1 }]);
            expect(menu?.components).toEqual([{ id: "k-1", name: "Ayam Bakar", cook: { id: "c-1", name: "Siti" } }]);
        });
    });
});

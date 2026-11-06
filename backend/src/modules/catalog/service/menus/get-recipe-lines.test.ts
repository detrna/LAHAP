import { describe, expect, it } from "vitest";
import { buildRecipeLine } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.getRecipeLines (unit)", () => {
    it("reads each menu once, without calling ingredients", async () => {
        const { repository, ingredients, service } = setupCatalogService();
        const line = buildRecipeLine({ menuId: "m-1" });
        repository.findRecipeLines.mockResolvedValue([line]);

        expect(await service.getRecipeLines(["m-1", "m-1"])).toEqual([line]);
        expect(repository.findRecipeLines).toHaveBeenCalledWith(["m-1"]);
        expect(ingredients.getIngredientsByIds).not.toHaveBeenCalled();
    });

    it("skips the repository for no menus", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.getRecipeLines([])).toEqual([]);
        expect(repository.findRecipeLines).not.toHaveBeenCalled();
    });
});

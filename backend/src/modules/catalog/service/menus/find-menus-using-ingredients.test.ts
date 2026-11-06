import { describe, expect, it } from "vitest";
import { buildMenuIngredientUsage } from "../../test-utils/factory/catalog.factory.js";
import { setupCatalogService } from "../../test-utils/setup/catalog.setup.js";

describe("CatalogService.findMenusUsingIngredients (unit)", () => {
    it("reads each ingredient once", async () => {
        const { repository, service } = setupCatalogService();
        const usage = buildMenuIngredientUsage({ ingredientId: "i-1" });
        repository.findMenusUsingIngredients.mockResolvedValue([usage]);

        expect(await service.findMenusUsingIngredients(["i-1", "i-1"])).toEqual([usage]);
        expect(repository.findMenusUsingIngredients).toHaveBeenCalledWith(["i-1"]);
    });

    it("skips the repository for no ingredients", async () => {
        const { repository, service } = setupCatalogService();

        expect(await service.findMenusUsingIngredients([])).toEqual([]);
        expect(repository.findMenusUsingIngredients).not.toHaveBeenCalled();
    });
});

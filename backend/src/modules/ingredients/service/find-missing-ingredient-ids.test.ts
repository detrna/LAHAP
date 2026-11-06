import { describe, expect, it } from "vitest";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";

describe("IngredientsService.findMissingIngredientIds (unit)", () => {
    it("answers an empty list for no ids without a query", async () => {
        const { repository, service } = setupIngredientsService();

        expect(await service.findMissingIngredientIds([])).toEqual([]);
        expect(repository.findMissingIds).not.toHaveBeenCalled();
    });

    it("returns the repository's missing ids for the distinct ids", async () => {
        const { repository, service } = setupIngredientsService();
        repository.findMissingIds.mockResolvedValue(["i-2"]);

        expect(await service.findMissingIngredientIds(["i-1", "i-2", "i-2"])).toEqual(["i-2"]);
        expect(repository.findMissingIds).toHaveBeenCalledWith(["i-1", "i-2"]);
    });
});

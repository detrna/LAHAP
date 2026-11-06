import { describe, expect, it } from "vitest";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";

describe("IngredientsService.getIngredientsByIds (unit)", () => {
    it("answers an empty list for no ids without a query", async () => {
        const { repository, service } = setupIngredientsService();

        expect(await service.getIngredientsByIds([])).toEqual([]);
        expect(repository.findByIds).not.toHaveBeenCalled();
    });

    it("looks each id up once and presents the rows", async () => {
        const { repository, service } = setupIngredientsService();
        repository.findByIds.mockResolvedValue([buildIngredientRecord({ id: "i-1" })]);

        const items = await service.getIngredientsByIds(["i-1", "i-1"]);

        expect(repository.findByIds).toHaveBeenCalledWith(["i-1"]);
        expect(items.map(item => item.id)).toEqual(["i-1"]);
    });
});

import { describe, expect, it } from "vitest";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";

describe("IngredientsService.getAllergyIdsByIngredientIds (unit)", () => {
    it("answers an empty list for no ids without a query", async () => {
        const { repository, service } = setupIngredientsService();

        expect(await service.getAllergyIdsByIngredientIds([])).toEqual([]);
        expect(repository.findByIds).not.toHaveBeenCalled();
    });

    it("looks each id up once and returns only the allergy ids, without signing photos", async () => {
        const { repository, objectStorage, service } = setupIngredientsService();
        repository.findByIds.mockResolvedValue([
            buildIngredientRecord({ id: "i-1", allergyIds: ["a-telur"] }),
            buildIngredientRecord({ id: "i-2", allergyIds: [] }),
        ]);

        const items = await service.getAllergyIdsByIngredientIds(["i-1", "i-2", "i-1"]);

        expect(repository.findByIds).toHaveBeenCalledWith(["i-1", "i-2"]);
        expect(items).toEqual([
            { ingredientId: "i-1", allergyIds: ["a-telur"] },
            { ingredientId: "i-2", allergyIds: [] },
        ]);
        expect(objectStorage.getSignedUrl).not.toHaveBeenCalled();
    });
});

import { describe, expect, it } from "vitest";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import { IngredientInUseError, IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

describe("IngredientsService.deleteIngredients (unit)", () => {
    it("answers the number of deleted rows", async () => {
        const { repository, service } = setupIngredientsService();
        repository.deleteMany.mockResolvedValue(2);

        expect(await service.deleteIngredients(["i-1", "i-2"])).toEqual({ deletedCount: 2 });
        expect(repository.deleteMany).toHaveBeenCalledWith(["i-1", "i-2"]);
    });

    it("lets the not-found and in-use errors through", async () => {
        const { repository, service } = setupIngredientsService();
        repository.deleteMany.mockRejectedValueOnce(new IngredientNotFoundError("i-1"));
        repository.deleteMany.mockRejectedValueOnce(new IngredientInUseError());

        await expect(service.deleteIngredients(["i-1"])).rejects.toBeInstanceOf(IngredientNotFoundError);
        await expect(service.deleteIngredients(["i-1"])).rejects.toBeInstanceOf(IngredientInUseError);
    });
});

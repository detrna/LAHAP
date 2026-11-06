import { describe, expect, it } from "vitest";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

describe("IngredientsService.getIngredient (unit)", () => {
    it("presents the ingredient", async () => {
        const { repository, service } = setupIngredientsService();
        repository.findById.mockResolvedValue(buildIngredientRecord({ id: "i-1" }));

        expect(await service.getIngredient("i-1")).toMatchObject({ id: "i-1", name: "Dada Ayam" });
    });

    it("throws IngredientNotFoundError when missing", async () => {
        const { service } = setupIngredientsService();

        await expect(service.getIngredient("missing")).rejects.toBeInstanceOf(IngredientNotFoundError);
    });
});

import { describe, expect, it } from "vitest";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

describe("IngredientsService.updateStock (unit)", () => {
    it("changes only the stock", async () => {
        const { repository, service } = setupIngredientsService();
        const record = buildIngredientRecord({ id: "i-1", stock: 7 });
        repository.findByIds.mockResolvedValue([record]);
        repository.updateMany.mockResolvedValue([record]);

        const item = await service.updateStock("i-1", 7);

        expect(repository.updateMany).toHaveBeenCalledWith([{ id: "i-1", changes: { stock: 7 } }]);
        expect(item.stock).toBe(7);
    });

    it("throws IngredientNotFoundError when missing", async () => {
        const { service } = setupIngredientsService();

        await expect(service.updateStock("missing", 1)).rejects.toBeInstanceOf(IngredientNotFoundError);
    });
});

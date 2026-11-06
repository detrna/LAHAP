import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

describe("IngredientsController.updateIngredients (unit)", () => {
    it("passes the items", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const updated = [buildIngredient()];
        ingredientsService.updateIngredients.mockResolvedValue(updated);
        const res = createMockResponse();
        const items = [{ id: "00000000-0000-4000-8000-000000000001", stock: 5 }];

        await controller.updateIngredients(createMockRequest({ body: { items } }), res);

        expect(ingredientsService.updateIngredients).toHaveBeenCalledWith(items);
        expect(res.json).toHaveBeenCalledWith({ data: updated });
    });
});

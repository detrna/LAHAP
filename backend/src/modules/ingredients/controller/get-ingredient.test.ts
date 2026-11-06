import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("IngredientsController.getIngredient (unit)", () => {
    it("answers the ingredient", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const item = buildIngredient();
        ingredientsService.getIngredient.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.getIngredient(createMockRequest({ params: { id: ID } }), res);

        expect(ingredientsService.getIngredient).toHaveBeenCalledWith(ID);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

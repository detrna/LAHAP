import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("IngredientsController.updateIngredient (unit)", () => {
    it("passes the id and body", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const item = buildIngredient();
        ingredientsService.updateIngredient.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.updateIngredient(createMockRequest({ params: { id: ID }, body: { stock: 4 } }), res);

        expect(ingredientsService.updateIngredient).toHaveBeenCalledWith(ID, { stock: 4 });
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

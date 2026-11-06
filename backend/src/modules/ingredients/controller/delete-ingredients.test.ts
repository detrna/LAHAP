import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

describe("IngredientsController.deleteIngredients (unit)", () => {
    it("passes the ids and answers the deleted count", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        ingredientsService.deleteIngredients.mockResolvedValue({ deletedCount: 2 });
        const res = createMockResponse();
        const ids = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"];

        await controller.deleteIngredients(createMockRequest({ body: { ids } }), res);

        expect(ingredientsService.deleteIngredients).toHaveBeenCalledWith(ids);
        expect(res.json).toHaveBeenCalledWith({ data: { deletedCount: 2 } });
    });
});

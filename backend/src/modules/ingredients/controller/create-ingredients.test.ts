import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

describe("IngredientsController.createIngredients (unit)", () => {
    it("creates the items and answers 201", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const created = [buildIngredient()];
        ingredientsService.createIngredients.mockResolvedValue(created);
        const res = createMockResponse();
        const items = [{ name: "Dada Ayam", unit: "kg", photoKey: "ingredients/2026/11/a.webp" }];

        await controller.createIngredients(createMockRequest({ body: { items } }), res);

        expect(ingredientsService.createIngredients).toHaveBeenCalledWith(items);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: created });
    });
});

import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const USER = { userId: "00000000-0000-4000-8000-000000000099", name: "Admin", role: "ADMIN" as const };

describe("IngredientsController.createIngredients (unit)", () => {
    it("creates the items and answers 201", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const created = [buildIngredient()];
        ingredientsService.createIngredients.mockResolvedValue(created);
        const res = createMockResponse();
        const items = [{ name: "Dada Ayam", unit: "kg", photoKey: "ingredients/2026/11/a.webp" }];

        await controller.createIngredients(createMockRequest({ body: { items }, user: USER }), res);

        expect(ingredientsService.createIngredients).toHaveBeenCalledWith(items, USER.userId);
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ data: created });
    });
});

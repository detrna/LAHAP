import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const USER = { userId: "00000000-0000-4000-8000-000000000099", name: "Admin", role: "ADMIN" as const };

describe("IngredientsController.updateIngredients (unit)", () => {
    it("passes the items and actor id", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const updated = [buildIngredient()];
        ingredientsService.updateIngredients.mockResolvedValue(updated);
        const res = createMockResponse();
        const items = [{ id: "00000000-0000-4000-8000-000000000001", stock: 5 }];

        await controller.updateIngredients(createMockRequest({ body: { items }, user: USER }), res);

        expect(ingredientsService.updateIngredients).toHaveBeenCalledWith(items, USER.userId);
        expect(res.json).toHaveBeenCalledWith({ data: updated });
    });
});

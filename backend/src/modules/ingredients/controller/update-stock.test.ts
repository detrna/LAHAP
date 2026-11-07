import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";
const USER = { userId: "00000000-0000-4000-8000-000000000099", name: "Kitchen", role: "KITCHEN" as const };

describe("IngredientsController.updateStock (unit)", () => {
    it("passes the id, counted stock and actor id", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const item = buildIngredient({ stock: 6 });
        ingredientsService.updateStock.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.updateStock(createMockRequest({ params: { id: ID }, body: { stock: 6 }, user: USER }), res);

        expect(ingredientsService.updateStock).toHaveBeenCalledWith(ID, 6, USER.userId);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

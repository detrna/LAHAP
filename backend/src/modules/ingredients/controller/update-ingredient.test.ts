import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";
const USER = { userId: "00000000-0000-4000-8000-000000000099", name: "Admin", role: "ADMIN" as const };

describe("IngredientsController.updateIngredient (unit)", () => {
    it("passes the id, body and actor id", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const item = buildIngredient();
        ingredientsService.updateIngredient.mockResolvedValue(item);
        const res = createMockResponse();

        await controller.updateIngredient(
            createMockRequest({ params: { id: ID }, body: { stock: 4 }, user: USER }),
            res,
        );

        expect(ingredientsService.updateIngredient).toHaveBeenCalledWith(ID, { stock: 4 }, USER.userId);
        expect(res.json).toHaveBeenCalledWith({ data: item });
    });
});

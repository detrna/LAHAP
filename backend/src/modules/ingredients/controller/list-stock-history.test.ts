import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredientStockChange } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const ID = "00000000-0000-4000-8000-000000000001";

describe("IngredientsController.listStockHistory (unit)", () => {
    it("passes the id and pagination and returns a paginated envelope", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const items = [buildIngredientStockChange({ ingredientId: ID })];
        ingredientsService.listStockHistory.mockResolvedValue({ items, total: 1 });
        const res = createMockResponse();

        await controller.listStockHistory(
            createMockRequest({
                params: { id: ID },
                pagination: { page: 2, limit: 5, offset: 5, skip: 5, take: 5 },
            }),
            res,
        );

        expect(ingredientsService.listStockHistory).toHaveBeenCalledWith(ID, { skip: 5, take: 5 });
        expect(res.json).toHaveBeenCalledWith({
            data: items,
            meta: {
                page: 2,
                limit: 5,
                total: 1,
                totalPages: 1,
                hasNextPage: false,
                hasPrevPage: true,
            },
        });
    });
});

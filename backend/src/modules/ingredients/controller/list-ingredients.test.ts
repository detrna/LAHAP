import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildIngredient } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

const PAGINATION = { page: 2, limit: 10, offset: 10, skip: 10, take: 10 };

describe("IngredientsController.listIngredients (unit)", () => {
    it("passes the filters and pagination, and answers a page", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const items = [buildIngredient()];
        ingredientsService.listIngredients.mockResolvedValue({ items, total: 1 });
        const res = createMockResponse();

        await controller.listIngredients(
            createMockRequest({
                query: { search: "ayam", lowStock: true, page: 2, limit: 10 },
                pagination: PAGINATION,
            }),
            res,
        );

        expect(ingredientsService.listIngredients).toHaveBeenCalledWith({
            search: "ayam",
            lowStock: true,
            skip: 10,
            take: 10,
        });
        expect(res.json).toHaveBeenCalledWith({ data: items, meta: expect.objectContaining({ total: 1 }) });
    });
});

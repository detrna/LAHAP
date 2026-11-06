import { describe, expect, it } from "vitest";
import { createMockRequest, createMockResponse } from "../../../../tests/utils/mocks/express.js";
import { buildShoppingListItem } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsController } from "../test-utils/setup/ingredients.setup.js";

describe("IngredientsController.getShoppingList (unit)", () => {
    it("passes the range and answers the list", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        const items = [buildShoppingListItem()];
        ingredientsService.getShoppingList.mockResolvedValue(items);
        const from = Temporal.PlainDate.from("2026-11-09");
        const to = Temporal.PlainDate.from("2026-11-15");
        const res = createMockResponse();

        await controller.getShoppingList(createMockRequest({ query: { from, to } }), res);

        expect(ingredientsService.getShoppingList).toHaveBeenCalledWith({ from, to });
        expect(res.json).toHaveBeenCalledWith({ data: items });
    });

    it("passes no range when none is given", async () => {
        const { ingredientsService, controller } = setupIngredientsController();
        ingredientsService.getShoppingList.mockResolvedValue([]);

        await controller.getShoppingList(createMockRequest({ query: {} }), createMockResponse());

        expect(ingredientsService.getShoppingList).toHaveBeenCalledWith({ from: undefined, to: undefined });
    });
});

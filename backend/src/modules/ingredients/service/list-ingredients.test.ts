import { describe, expect, it } from "vitest";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";

describe("IngredientsService.listIngredients (unit)", () => {
    it("passes the filters through and presents the page", async () => {
        const { repository, service } = setupIngredientsService();
        repository.list.mockResolvedValue({ items: [buildIngredientRecord({ stock: 3 })], total: 41 });

        const page = await service.listIngredients({ search: "ayam", lowStock: true, skip: 20, take: 10 });

        expect(repository.list).toHaveBeenCalledWith({ search: "ayam", lowStock: true, skip: 20, take: 10 });
        expect(page.total).toBe(41);
        expect(page.items).toHaveLength(1);
        expect(page.items[0]).toMatchObject({ stock: 3, isLowStock: true });
    });

    it("answers an empty page", async () => {
        const { service } = setupIngredientsService();

        expect(await service.listIngredients({ skip: 0, take: 10 })).toEqual({ items: [], total: 0 });
    });
});

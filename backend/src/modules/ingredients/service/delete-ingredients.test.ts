import { describe, expect, it } from "vitest";
import { buildMenuIngredientUsage } from "../../catalog/test-utils/factory/catalog.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import { IngredientInUseError, IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

describe("IngredientsService.deleteIngredients (unit)", () => {
    it("answers the number of deleted rows", async () => {
        const { repository, menus, service } = setupIngredientsService();
        repository.deleteMany.mockResolvedValue(2);

        expect(await service.deleteIngredients(["i-1", "i-2"])).toEqual({ deletedCount: 2 });
        expect(menus.findMenusUsingIngredients).toHaveBeenCalledWith(["i-1", "i-2"]);
        expect(repository.deleteMany).toHaveBeenCalledWith(["i-1", "i-2"]);
    });

    it("names the distinct menus that still use an ingredient and deletes nothing", async () => {
        const { repository, menus, service } = setupIngredientsService();
        menus.findMenusUsingIngredients.mockResolvedValue([
            buildMenuIngredientUsage({ ingredientId: "i-1", menuId: "m-1", menuName: "Nasi Ayam" }),
            buildMenuIngredientUsage({ ingredientId: "i-2", menuId: "m-1", menuName: "Nasi Ayam" }),
            buildMenuIngredientUsage({ ingredientId: "i-2", menuId: "m-2", menuName: "Soto" }),
        ]);

        const error = await service.deleteIngredients(["i-1", "i-2"]).catch((cause: unknown) => cause);

        expect(error).toBeInstanceOf(IngredientInUseError);
        expect((error as IngredientInUseError).message).toBe("ingredient is used by menus: Nasi Ayam, Soto");
        expect((error as IngredientInUseError).statusCode).toBe(409);
        expect(repository.deleteMany).not.toHaveBeenCalled();
    });

    it("lets the not-found and in-use errors of the repository through", async () => {
        const { repository, service } = setupIngredientsService();
        repository.deleteMany.mockRejectedValueOnce(new IngredientNotFoundError("i-1"));
        repository.deleteMany.mockRejectedValueOnce(new IngredientInUseError());

        await expect(service.deleteIngredients(["i-1"])).rejects.toBeInstanceOf(IngredientNotFoundError);
        await expect(service.deleteIngredients(["i-1"])).rejects.toBeInstanceOf(IngredientInUseError);
    });
});

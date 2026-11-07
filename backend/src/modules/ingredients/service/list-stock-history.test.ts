import { describe, expect, it } from "vitest";
import { buildUserSummary } from "../../users/test-utils/factory/users.factory.js";
import { buildIngredientRecord, buildIngredientStockChangeRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

describe("IngredientsService.listStockHistory (unit)", () => {
    it("throws IngredientNotFoundError without querying history when the ingredient is missing", async () => {
        const { repository, service } = setupIngredientsService();

        await expect(service.listStockHistory("missing", { skip: 0, take: 20 })).rejects.toBeInstanceOf(
            IngredientNotFoundError,
        );
        expect(repository.listStockHistory).not.toHaveBeenCalled();
    });

    it("returns an empty page without looking up users when there are no history rows", async () => {
        const { repository, users, service } = setupIngredientsService();
        repository.findById.mockResolvedValue(buildIngredientRecord({ id: "i-1" }));
        repository.listStockHistory.mockResolvedValue({ items: [], total: 0 });

        const page = await service.listStockHistory("i-1", { skip: 0, take: 20 });

        expect(page).toEqual({ items: [], total: 0 });
        expect(users.getSummaries).not.toHaveBeenCalled();
    });

    it("hydrates distinct actors, derives delta and formats changedAt in Asia/Jakarta", async () => {
        const { repository, users, service } = setupIngredientsService();
        repository.findById.mockResolvedValue(buildIngredientRecord({ id: "i-1" }));
        repository.listStockHistory.mockResolvedValue({
            items: [
                buildIngredientStockChangeRecord({
                    id: "h-2",
                    ingredientId: "i-1",
                    previousStock: 10,
                    newStock: 6.45,
                    changedById: "u-1",
                    changedAt: Temporal.PlainDateTime.from("2026-11-03T02:30:00"),
                }),
                buildIngredientStockChangeRecord({
                    id: "h-1",
                    ingredientId: "i-1",
                    previousStock: 0,
                    newStock: 10,
                    changedById: "u-2",
                    changedAt: Temporal.PlainDateTime.from("2026-11-03T01:00:00"),
                }),
            ],
            total: 2,
        });
        const actor1 = buildUserSummary({ id: "u-1", name: "Koki Budi", role: "KITCHEN" });
        users.getSummaries.mockResolvedValue([actor1]);

        const page = await service.listStockHistory("i-1", { skip: 0, take: 10 });

        expect(users.getSummaries).toHaveBeenCalledWith(["u-1", "u-2"]);
        expect(page).toEqual({
            items: [
                {
                    id: "h-2",
                    ingredientId: "i-1",
                    previousStock: 10,
                    newStock: 6.45,
                    delta: -3.55,
                    changedById: "u-1",
                    changedBy: actor1,
                    changedAt: "2026-11-03T09:30:00.000+07:00",
                },
                {
                    id: "h-1",
                    ingredientId: "i-1",
                    previousStock: 0,
                    newStock: 10,
                    delta: 10,
                    changedById: "u-2",
                    changedBy: null,
                    changedAt: "2026-11-03T08:00:00.000+07:00",
                },
            ],
            total: 2,
        });
    });
});

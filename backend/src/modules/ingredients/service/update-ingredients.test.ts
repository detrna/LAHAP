import { describe, expect, it } from "vitest";
import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import { IngredientAlreadyExistsError, IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

const ACTOR_ID = "user-1";
const FIRST = buildIngredientRecord({ id: "i-1", name: "Bawang", photoKey: "ingredients/2026/11/old-1.webp" });
const SECOND = buildIngredientRecord({ id: "i-2", name: "Cabai", photoKey: "ingredients/2026/11/old-2.webp" });

function setup() {
    const context = setupIngredientsService();
    context.repository.findByIds.mockResolvedValue([FIRST, SECOND]);
    context.repository.updateMany.mockResolvedValue([FIRST, SECOND]);
    return context;
}

describe("IngredientsService.updateIngredients (unit)", () => {
    it("splits the id from the changes and answers in request order", async () => {
        const { repository, clock, service } = setup();

        const items = await service.updateIngredients(
            [
                { id: "i-1", stock: 5 },
                { id: "i-2", name: "Cabai Rawit" },
            ],
            ACTOR_ID,
        );

        expect(repository.updateMany).toHaveBeenCalledWith(
            [
                { id: "i-1", changes: { stock: 5 } },
                { id: "i-2", changes: { name: "Cabai Rawit" } },
            ],
            { changedById: ACTOR_ID, changedAt: toDbTimestamp(clock.now()) },
        );
        expect(items.map(item => item.id)).toEqual(["i-1", "i-2"]);
    });

    it("throws IngredientNotFoundError for the missing id and writes nothing", async () => {
        const { repository, service } = setup();

        const attempt = service.updateIngredients(
            [
                { id: "i-1", stock: 5 },
                { id: "missing", stock: 1 },
            ],
            ACTOR_ID,
        );

        await expect(attempt).rejects.toBeInstanceOf(IngredientNotFoundError);
        await expect(attempt).rejects.toMatchObject({ ingredientId: "missing" });
        expect(repository.updateMany).not.toHaveBeenCalled();
    });

    it("rejects two items renaming to the same name", async () => {
        const { repository, service } = setup();

        await expect(
            service.updateIngredients(
                [
                    { id: "i-1", name: "Sama" },
                    { id: "i-2", name: "Sama" },
                ],
                ACTOR_ID,
            ),
        ).rejects.toBeInstanceOf(IngredientAlreadyExistsError);
        expect(repository.updateMany).not.toHaveBeenCalled();
    });

    it("checks new photo keys on their item paths and skips unchanged ones", async () => {
        const { photoKeys, service } = setup();

        await service.updateIngredients(
            [
                { id: "i-1", photoKey: "ingredients/2026/11/old-1.webp" },
                { id: "i-2", photoKey: "ingredients/2026/11/new-2.webp" },
            ],
            ACTOR_ID,
        );

        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledTimes(1);
        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith(
            "ingredients/2026/11/new-2.webp",
            "items.1.photoKey",
        );
    });

    it("checks the allergens of the whole batch in one call", async () => {
        const { allergies, service } = setup();

        await service.updateIngredients(
            [
                { id: "i-1", allergyIds: ["a-1"] },
                { id: "i-2", allergyIds: ["a-1", "a-2"] },
            ],
            ACTOR_ID,
        );

        expect(allergies.findMissingAllergyIds).toHaveBeenCalledTimes(1);
        expect(allergies.findMissingAllergyIds).toHaveBeenCalledWith(["a-1", "a-2"]);
    });
});

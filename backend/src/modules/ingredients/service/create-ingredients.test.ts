import { describe, expect, it } from "vitest";
import { UnknownAllergyError } from "../../../shared/errors/unknown-allergy-error.js";
import { ValidationError } from "../../../shared/errors/validation-error.js";
import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import type { CreateIngredientInput } from "./create-ingredients.js";
import { IngredientAlreadyExistsError } from "./interfaces/ingredients.repository.js";

const ACTOR_ID = "user-1";

const input = (overrides: Partial<CreateIngredientInput> = {}): CreateIngredientInput => ({
    name: "Dada Ayam",
    unit: "kg",
    photoKey: "ingredients/2026/11/a.webp",
    ...overrides,
});

describe("IngredientsService.createIngredients (unit)", () => {
    it("defaults stock to 0, the threshold to 10 and the allergens to none", async () => {
        const { repository, clock, service } = setupIngredientsService();
        repository.createMany.mockResolvedValue([buildIngredientRecord()]);

        await service.createIngredients([input()], ACTOR_ID);

        expect(repository.createMany).toHaveBeenCalledWith(
            [
                {
                    name: "Dada Ayam",
                    unit: "kg",
                    stock: 0,
                    minimumThreshold: 10,
                    photoKey: "ingredients/2026/11/a.webp",
                    allergyIds: [],
                },
            ],
            { changedById: ACTOR_ID, changedAt: toDbTimestamp(clock.now()) },
        );
    });

    it("keeps the given numbers and allergens, and answers in request order", async () => {
        const { repository, clock, service } = setupIngredientsService();
        repository.createMany.mockResolvedValue([
            buildIngredientRecord({ id: "i-1", name: "Bawang" }),
            buildIngredientRecord({ id: "i-2", name: "Cabai" }),
        ]);

        const items = await service.createIngredients(
            [
                input({ name: "Bawang", stock: 4.5, minimumThreshold: 2, allergyIds: ["a-1"] }),
                input({ name: "Cabai", unit: "gram" }),
            ],
            ACTOR_ID,
        );

        expect(repository.createMany).toHaveBeenCalledWith(
            [
                expect.objectContaining({ name: "Bawang", stock: 4.5, minimumThreshold: 2, allergyIds: ["a-1"] }),
                expect.objectContaining({ name: "Cabai", unit: "gram", stock: 0 }),
            ],
            { changedById: ACTOR_ID, changedAt: toDbTimestamp(clock.now()) },
        );
        expect(items.map(item => item.id)).toEqual(["i-1", "i-2"]);
    });

    it("rejects a duplicate name inside the batch before writing", async () => {
        const { repository, service } = setupIngredientsService();

        await expect(service.createIngredients([input(), input()], ACTOR_ID)).rejects.toBeInstanceOf(
            IngredientAlreadyExistsError,
        );
        expect(repository.createMany).not.toHaveBeenCalled();
    });

    it("checks every allergy of the batch in one call and rejects unknown ones", async () => {
        const { allergies, repository, service } = setupIngredientsService();
        allergies.findMissingAllergyIds.mockResolvedValue(["a-2"]);

        const attempt = service.createIngredients(
            [input({ allergyIds: ["a-1", "a-2"] }), input({ name: "Cabai", allergyIds: ["a-2"] })],
            ACTOR_ID,
        );

        await expect(attempt).rejects.toBeInstanceOf(UnknownAllergyError);
        await expect(attempt).rejects.toMatchObject({ allergyIds: ["a-2"] });
        expect(allergies.findMissingAllergyIds).toHaveBeenCalledWith(["a-1", "a-2"]);
        expect(repository.createMany).not.toHaveBeenCalled();
    });

    it("does not look up allergies when none are given", async () => {
        const { allergies, service } = setupIngredientsService();

        await service.createIngredients([input()], ACTOR_ID);

        expect(allergies.findMissingAllergyIds).not.toHaveBeenCalled();
    });

    it("checks each photo key on its item path", async () => {
        const { photoKeys, service } = setupIngredientsService();

        await service.createIngredients(
            [input(), input({ name: "Cabai", photoKey: "ingredients/2026/11/b.webp" })],
            ACTOR_ID,
        );

        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("ingredients/2026/11/a.webp", "items.0.photoKey");
        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("ingredients/2026/11/b.webp", "items.1.photoKey");
    });

    it("writes nothing when a photo is missing", async () => {
        const { photoKeys, repository, service } = setupIngredientsService();
        photoKeys.assertPhotoKeyExists.mockRejectedValue(new ValidationError([]));

        await expect(service.createIngredients([input()], ACTOR_ID)).rejects.toBeInstanceOf(ValidationError);
        expect(repository.createMany).not.toHaveBeenCalled();
    });
});

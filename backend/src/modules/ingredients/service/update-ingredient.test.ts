import { describe, expect, it } from "vitest";
import { UnknownAllergyError } from "../../../shared/errors/unknown-allergy-error.js";
import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import { buildIngredientRecord } from "../test-utils/factory/ingredients.factory.js";
import { setupIngredientsService } from "../test-utils/setup/ingredients.setup.js";
import { IngredientAlreadyExistsError, IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

const ACTOR_ID = "user-1";
const EXISTING = buildIngredientRecord({ id: "i-1", photoKey: "ingredients/2026/11/old.webp" });

function setup() {
    const context = setupIngredientsService();
    context.repository.findByIds.mockResolvedValue([EXISTING]);
    context.repository.updateMany.mockResolvedValue([EXISTING]);
    return context;
}

describe("IngredientsService.updateIngredient (unit)", () => {
    it("throws IngredientNotFoundError when the ingredient is missing", async () => {
        const { repository, service } = setupIngredientsService();

        await expect(service.updateIngredient("missing", { stock: 3 }, ACTOR_ID)).rejects.toBeInstanceOf(
            IngredientNotFoundError,
        );
        expect(repository.updateMany).not.toHaveBeenCalled();
    });

    it("sends only the given fields", async () => {
        const { repository, clock, service } = setup();

        await service.updateIngredient("i-1", { stock: 3, minimumThreshold: 1 }, ACTOR_ID);

        expect(repository.updateMany).toHaveBeenCalledWith(
            [{ id: "i-1", changes: { stock: 3, minimumThreshold: 1 } }],
            { changedById: ACTOR_ID, changedAt: toDbTimestamp(clock.now()) },
        );
    });

    it("checks a new photo key on the photoKey path", async () => {
        const { photoKeys, service } = setup();

        await service.updateIngredient("i-1", { photoKey: "ingredients/2026/11/new.webp" }, ACTOR_ID);

        expect(photoKeys.assertPhotoKeyExists).toHaveBeenCalledWith("ingredients/2026/11/new.webp", "photoKey");
    });

    it("skips the check when the photo key is the stored one", async () => {
        const { photoKeys, service } = setup();

        await service.updateIngredient("i-1", { photoKey: "ingredients/2026/11/old.webp" }, ACTOR_ID);

        expect(photoKeys.assertPhotoKeyExists).not.toHaveBeenCalled();
    });

    it("rejects unknown allergens", async () => {
        const { allergies, repository, service } = setup();
        allergies.findMissingAllergyIds.mockResolvedValue(["a-9"]);

        await expect(service.updateIngredient("i-1", { allergyIds: ["a-9"] }, ACTOR_ID)).rejects.toBeInstanceOf(
            UnknownAllergyError,
        );
        expect(repository.updateMany).not.toHaveBeenCalled();
    });

    it("accepts clearing the allergens without a lookup", async () => {
        const { allergies, repository, clock, service } = setup();

        await service.updateIngredient("i-1", { allergyIds: [] }, ACTOR_ID);

        expect(allergies.findMissingAllergyIds).not.toHaveBeenCalled();
        expect(repository.updateMany).toHaveBeenCalledWith([{ id: "i-1", changes: { allergyIds: [] } }], {
            changedById: ACTOR_ID,
            changedAt: toDbTimestamp(clock.now()),
        });
    });

    it("lets a name conflict from the repository through", async () => {
        const { repository, service } = setup();
        repository.updateMany.mockRejectedValue(new IngredientAlreadyExistsError("Dada Ayam"));

        await expect(service.updateIngredient("i-1", { name: "Dada Ayam" }, ACTOR_ID)).rejects.toBeInstanceOf(
            IngredientAlreadyExistsError,
        );
    });
});

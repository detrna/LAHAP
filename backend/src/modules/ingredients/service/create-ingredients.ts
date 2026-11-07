import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import type { Ingredient, IngredientUnit } from "../domain/ingredient.domain.js";
import { assertDistinctNames } from "./assert-distinct-names.js";
import { ensureKnownAllergies } from "./ensure-known-allergies.js";
import type { IngredientsService } from "./ingredients.service.js";

export const DEFAULT_STOCK = 0;
export const DEFAULT_MINIMUM_THRESHOLD = 10;

export interface CreateIngredientInput {
    readonly name: string;
    readonly unit: IngredientUnit;
    readonly stock?: number | undefined;
    readonly minimumThreshold?: number | undefined;
    readonly photoKey: string;
    readonly allergyIds?: readonly string[] | undefined;
}

export async function createIngredients(
    this: IngredientsService,
    inputs: readonly CreateIngredientInput[],
    actorId: string,
): Promise<Ingredient[]> {
    assertDistinctNames(inputs.map(input => input.name));
    await ensureKnownAllergies(
        this.allergies,
        inputs.flatMap(input => input.allergyIds ?? []),
    );
    await Promise.all(
        inputs.map((input, index) => this.photoKeys.assertPhotoKeyExists(input.photoKey, `items.${index}.photoKey`)),
    );

    const records = await this.ingredientsRepository.createMany(
        inputs.map(input => ({
            name: input.name,
            unit: input.unit,
            stock: input.stock ?? DEFAULT_STOCK,
            minimumThreshold: input.minimumThreshold ?? DEFAULT_MINIMUM_THRESHOLD,
            photoKey: input.photoKey,
            allergyIds: input.allergyIds ?? [],
        })),
        { changedById: actorId, changedAt: toDbTimestamp(this.clock.now()) },
    );
    return this.presentIngredients(records);
}

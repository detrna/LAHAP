import { toDbTimestamp } from "../../../shared/time/timestamp.js";
import type { Ingredient } from "../domain/ingredient.domain.js";
import { assertDistinctNames } from "./assert-distinct-names.js";
import { ensureKnownAllergies } from "./ensure-known-allergies.js";
import type { IngredientsService } from "./ingredients.service.js";
import type { IngredientUpdateRecord } from "./interfaces/ingredients.repository.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";

export async function applyIngredientUpdates(
    this: IngredientsService,
    updates: readonly IngredientUpdateRecord[],
    actorId: string,
    photoPath: (index: number) => string,
): Promise<Ingredient[]> {
    const existing = await this.ingredientsRepository.findByIds(updates.map(update => update.id));
    const photoKeyById = new Map(existing.map(record => [record.id, record.photoKey]));
    for (const update of updates) {
        if (!photoKeyById.has(update.id)) throw new IngredientNotFoundError(update.id);
    }

    assertDistinctNames(updates.flatMap(update => (update.changes.name !== undefined ? [update.changes.name] : [])));
    await ensureKnownAllergies(
        this.allergies,
        updates.flatMap(update => update.changes.allergyIds ?? []),
    );
    await Promise.all(
        updates.map(async (update, index) => {
            const { photoKey } = update.changes;
            if (photoKey !== undefined && photoKey !== photoKeyById.get(update.id)) {
                await this.photoKeys.assertPhotoKeyExists(photoKey, photoPath(index));
            }
        }),
    );

    return this.presentIngredients(
        await this.ingredientsRepository.updateMany(updates, {
            changedById: actorId,
            changedAt: toDbTimestamp(this.clock.now()),
        }),
    );
}

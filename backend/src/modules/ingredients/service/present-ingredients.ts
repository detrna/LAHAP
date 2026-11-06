import { toPhotoUrls } from "../../../shared/media/photo.js";
import type { Ingredient } from "../domain/ingredient.domain.js";
import type { IngredientsService } from "./ingredients.service.js";
import type { IngredientRecord } from "./interfaces/ingredients.repository.js";
import { IngredientNotFoundError } from "./interfaces/ingredients.repository.js";
import { toIngredient } from "./to-ingredient.js";

export async function presentIngredients(
    this: IngredientsService,
    records: readonly IngredientRecord[],
): Promise<Ingredient[]> {
    if (records.length === 0) return [];

    const allergyIds = [...new Set(records.flatMap(record => record.allergyIds))];
    const [allergies, photoUrls] = await Promise.all([
        this.allergies.getAllergiesByIds(allergyIds),
        toPhotoUrls(
            this.objectStorage,
            records.map(record => record.photoKey),
        ),
    ]);

    return records.map((record, index) => {
        const ids = new Set(record.allergyIds);
        return toIngredient(record, {
            photoUrl: photoUrls[index] ?? "",
            allergies: allergies.filter(allergy => ids.has(allergy.id)),
        });
    });
}

export async function presentIngredient(this: IngredientsService, record: IngredientRecord): Promise<Ingredient> {
    const [item] = await this.presentIngredients([record]);
    if (item === undefined) throw new IngredientNotFoundError(record.id);
    return item;
}

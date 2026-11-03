import { ALLERGIES } from "../allergies/allergies.data.js";
import type { SeedContext } from "../../seed-context.js";
import { INGREDIENTS, ingredientPhotoKey } from "./ingredients.data.js";

export async function seedIngredients({ tx, logger }: SeedContext): Promise<number> {
    const ingredients = Object.values(INGREDIENTS);

    for (const { allergies, ...ingredient } of ingredients) {
        const { id, ...fields } = ingredient;
        const photoKey = ingredientPhotoKey(id);
        await tx.orm.public.Ingredient.upsert({ create: { ...ingredient, photoKey }, update: { ...fields, photoKey } });

        await tx.orm.public.IngredientAllergy.where({ ingredientId: id }).deleteAll();
        if (allergies.length > 0) {
            await tx.orm.public.IngredientAllergy.createAll(
                allergies.map(key => ({ ingredientId: id, allergyId: ALLERGIES[key].id })),
            );
        }
        logger.info(
            { id, name: ingredient.name, unit: ingredient.unit, stock: ingredient.stock, allergies },
            "upserted ingredient",
        );
    }
    return ingredients.length;
}

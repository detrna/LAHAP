import type { Ingredient } from "../../ingredients/domain/ingredient.domain.js";
import type { Allergy } from "./allergy.domain.js";

export function unionAllergies(ingredients: readonly Pick<Ingredient, "allergies">[]): Allergy[] {
    const byId = new Map<string, Allergy>();
    for (const ingredient of ingredients) {
        for (const allergy of ingredient.allergies ?? []) byId.set(allergy.id, allergy);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

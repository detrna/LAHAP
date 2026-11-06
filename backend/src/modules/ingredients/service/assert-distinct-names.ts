import { IngredientAlreadyExistsError } from "./interfaces/ingredients.repository.js";

export function assertDistinctNames(names: readonly string[]): void {
    const seen = new Set<string>();
    for (const name of names) {
        if (seen.has(name)) throw new IngredientAlreadyExistsError(name);
        seen.add(name);
    }
}

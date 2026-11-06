import type { Menu } from "../../domain/menu.domain.js";
import type { RecipeLineInput } from "../../domain/recipe.js";
import type { CatalogService } from "../catalog.service.js";
import { ensureKnownIngredients } from "./ensure-known-ingredients.js";

export interface CreateMenuInput {
    readonly name: string;
    readonly description: string;
    readonly isAlternative?: boolean | undefined;
    readonly tags?: readonly string[] | undefined;
    readonly photoKey: string;
    readonly ingredients: readonly RecipeLineInput[];
}

export async function createMenu(this: CatalogService, input: CreateMenuInput): Promise<Menu> {
    await ensureKnownIngredients(this.ingredients, input.ingredients);
    await this.photoKeys.assertPhotoKeyExists(input.photoKey);

    const record = await this.catalogRepository.createMenu({
        name: input.name,
        description: input.description,
        isAlternative: input.isAlternative ?? false,
        tags: input.tags ?? [],
        photoKey: input.photoKey,
        ingredients: input.ingredients,
    });
    return this.presentMenu(record);
}

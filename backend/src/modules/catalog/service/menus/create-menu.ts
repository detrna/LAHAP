import type { Menu, MenuComponentInput } from "../../domain/menu.domain.js";
import { toComponentRecords } from "../../domain/menu-components.js";
import type { RecipeLineInput } from "../../domain/recipe.js";
import type { CatalogService } from "../catalog.service.js";
import { ensureActiveCooks } from "./ensure-active-cooks.js";
import { ensureKnownIngredients } from "./ensure-known-ingredients.js";

export interface CreateMenuInput {
    readonly name: string;
    readonly description: string;
    readonly isAlternative?: boolean | undefined;
    readonly tags?: readonly string[] | undefined;
    readonly photoKey: string;
    readonly ingredients: readonly RecipeLineInput[];
    readonly components?: readonly MenuComponentInput[] | undefined;
}

export async function createMenu(this: CatalogService, input: CreateMenuInput): Promise<Menu> {
    const components = input.components ?? [];
    await ensureKnownIngredients(this.ingredients, input.ingredients);
    await ensureActiveCooks(this.cooks, components);
    await this.photoKeys.assertPhotoKeyExists(input.photoKey);

    const record = await this.catalogRepository.createMenu({
        name: input.name,
        description: input.description,
        isAlternative: input.isAlternative ?? false,
        tags: input.tags ?? [],
        photoKey: input.photoKey,
        ingredients: input.ingredients,
        components: toComponentRecords(components),
    });
    return this.presentMenu(record);
}

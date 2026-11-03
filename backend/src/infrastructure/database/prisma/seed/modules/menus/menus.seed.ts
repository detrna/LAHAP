import { INGREDIENTS, type IngredientKey } from "../ingredients/ingredients.data.js";
import type { SeedContext } from "../../seed-context.js";
import { MENUS, menuPhotoKey } from "./menus.data.js";

export async function seedMenus({ tx, logger }: SeedContext): Promise<number> {
    const menus = Object.values(MENUS);

    for (const { ingredients, ...menu } of menus) {
        const { id, ...fields } = menu;
        const row = { ...fields, tags: [...menu.tags], photoKey: menuPhotoKey(id) };
        await tx.orm.public.Menu.upsert({ create: { id, ...row }, update: row });

        await tx.orm.public.MenuIngredient.where({ menuId: id }).deleteAll();
        await tx.orm.public.MenuIngredient.createAll(
            Object.entries(ingredients).map(([key, quantityPerPortion]) => ({
                menuId: id,
                ingredientId: INGREDIENTS[key as IngredientKey].id,
                quantityPerPortion,
            })),
        );
        logger.info(
            {
                id,
                name: menu.name,
                isAlternative: menu.isAlternative,
                ingredientCount: Object.keys(ingredients).length,
            },
            "upserted menu",
        );
    }
    return menus.length;
}

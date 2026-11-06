import type { Menu } from "../../domain/menu.domain.js";
import type { CatalogService } from "../catalog.service.js";

export interface ListMenusInput {
    readonly search?: string | undefined;
    readonly isAlternative?: boolean | undefined;
    readonly skip: number;
    readonly take: number;
}

export interface MenuPage {
    readonly items: readonly Menu[];
    readonly total: number;
}

export async function listMenus(this: CatalogService, input: ListMenusInput): Promise<MenuPage> {
    const { items, total } = await this.catalogRepository.listMenus(input);
    return { items: await this.presentMenus(items, { withIngredients: true }), total };
}

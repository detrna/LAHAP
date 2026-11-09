import type { Menu, MenuAudience } from "../../domain/menu.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { MENU_VIEWS } from "./present-menus.js";

export interface GetMenusOptions {
    readonly audience?: MenuAudience | undefined;
}

export async function getMenusByIds(
    this: CatalogService,
    ids: readonly string[],
    { audience = "customer" }: GetMenusOptions = {},
): Promise<readonly Menu[]> {
    if (ids.length === 0) return [];
    const records = await this.catalogRepository.findMenusByIds([...new Set(ids)]);
    return this.presentMenus(records, MENU_VIEWS[audience]);
}

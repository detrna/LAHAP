import type { Menu } from "../../domain/menu.domain.js";
import type { CatalogService } from "../catalog.service.js";

export async function getMenusByIds(this: CatalogService, ids: readonly string[]): Promise<readonly Menu[]> {
    if (ids.length === 0) return [];
    const records = await this.catalogRepository.findMenusByIds([...new Set(ids)]);
    return this.presentMenus(records, { withIngredients: true });
}

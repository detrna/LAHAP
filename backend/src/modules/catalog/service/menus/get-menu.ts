import type { Menu } from "../../domain/menu.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { MenuNotFoundError } from "../interfaces/catalog.repository.js";

export async function getMenu(this: CatalogService, id: string): Promise<Menu> {
    const record = await this.catalogRepository.findMenuById(id);
    if (record === null) throw new MenuNotFoundError(id);
    return this.presentMenu(record);
}

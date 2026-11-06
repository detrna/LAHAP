import type { CatalogService } from "../catalog.service.js";
import { MenuNotFoundError } from "../interfaces/catalog.repository.js";

export async function deleteMenu(this: CatalogService, id: string): Promise<void> {
    if (!(await this.catalogRepository.deleteMenu(id))) throw new MenuNotFoundError(id);
}

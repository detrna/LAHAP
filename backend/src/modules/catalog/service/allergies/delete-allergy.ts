import type { CatalogService } from "../catalog.service.js";
import { AllergyNotFoundError } from "../interfaces/catalog.repository.js";

export async function deleteAllergy(this: CatalogService, id: string): Promise<void> {
    if (!(await this.catalogRepository.deleteAllergy(id))) throw new AllergyNotFoundError(id);
}

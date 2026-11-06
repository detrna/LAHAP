import type { Allergy } from "../../domain/allergy.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { AllergyNotFoundError } from "../interfaces/catalog.repository.js";
import { toAllergy } from "./to-allergy.js";

export async function getAllergy(this: CatalogService, id: string): Promise<Allergy> {
    const record = await this.catalogRepository.findAllergyById(id);
    if (record === null) throw new AllergyNotFoundError(id);
    return toAllergy(record);
}

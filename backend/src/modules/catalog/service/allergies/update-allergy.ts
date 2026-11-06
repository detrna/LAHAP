import type { Allergy } from "../../domain/allergy.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { AllergyNotFoundError } from "../interfaces/catalog.repository.js";
import { toAllergy } from "./to-allergy.js";

export interface UpdateAllergyInput {
    readonly name: string;
}

export async function updateAllergy(this: CatalogService, id: string, input: UpdateAllergyInput): Promise<Allergy> {
    const record = await this.catalogRepository.updateAllergy(id, input.name);
    if (record === null) throw new AllergyNotFoundError(id);
    return toAllergy(record);
}

import type { Allergy } from "../../domain/allergy.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { toAllergy } from "./to-allergy.js";

export interface CreateAllergyInput {
    readonly name: string;
}

export async function createAllergy(this: CatalogService, input: CreateAllergyInput): Promise<Allergy> {
    return toAllergy(await this.catalogRepository.createAllergy(input.name));
}

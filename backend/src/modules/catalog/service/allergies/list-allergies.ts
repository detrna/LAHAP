import type { Allergy } from "../../domain/allergy.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { toAllergy } from "./to-allergy.js";

export async function listAllergies(this: CatalogService): Promise<readonly Allergy[]> {
    return (await this.catalogRepository.findAllAllergies()).map(toAllergy);
}

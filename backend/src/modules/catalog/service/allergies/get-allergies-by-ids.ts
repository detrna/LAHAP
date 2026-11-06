import type { Allergy } from "../../domain/allergy.domain.js";
import type { CatalogService } from "../catalog.service.js";
import { toAllergy } from "./to-allergy.js";

export async function getAllergiesByIds(this: CatalogService, ids: readonly string[]): Promise<readonly Allergy[]> {
    if (ids.length === 0) return [];
    const records = await this.catalogRepository.findAllergiesByIds([...new Set(ids)]);
    return records.map(toAllergy);
}

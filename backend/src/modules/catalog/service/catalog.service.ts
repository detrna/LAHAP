import { findMissingAllergyIds } from "./allergies/find-missing-allergy-ids.js";
import { getAllergiesByIds } from "./allergies/get-allergies-by-ids.js";
import type { CatalogRepository } from "./interfaces/catalog.repository.js";

export class CatalogService {
    constructor(readonly catalogRepository: CatalogRepository) {}

    findMissingAllergyIds = findMissingAllergyIds;
    getAllergiesByIds = getAllergiesByIds;
}

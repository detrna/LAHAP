import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { CatalogRepository } from "../../service/interfaces/catalog.repository.js";
import { findAllergiesByIds } from "./allergies/find-allergies-by-ids.js";
import { findMissingAllergyIds } from "./allergies/find-missing-allergy-ids.js";

export class PrismaCatalogRepository implements CatalogRepository {
    constructor(readonly db: Db) {}

    findMissingAllergyIds = findMissingAllergyIds;
    findAllergiesByIds = findAllergiesByIds;
}

import type { Allergy } from "../../../catalog/domain/allergy.domain.js";

export interface AllergyLookup {
    findMissingAllergyIds(ids: readonly string[]): Promise<readonly string[]>;
    getAllergiesByIds(ids: readonly string[]): Promise<readonly Allergy[]>;
}

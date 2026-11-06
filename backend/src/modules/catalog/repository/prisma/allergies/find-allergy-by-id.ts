import type { AllergyRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toAllergyRecord } from "./to-allergy-record.js";

export async function findAllergyById(this: PrismaCatalogRepository, id: string): Promise<AllergyRecord | null> {
    try {
        const row = await this.db.orm.public.Allergy.where({ id }).first();
        return row === null ? null : toAllergyRecord(row);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findAllergyById", cause);
    }
}

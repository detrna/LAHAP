import type { AllergyRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toAllergyRecord } from "./to-allergy-record.js";

export async function findAllAllergies(this: PrismaCatalogRepository): Promise<readonly AllergyRecord[]> {
    try {
        const rows = await this.db.orm.public.Allergy.orderBy([
            allergy => allergy.name.asc(),
            allergy => allergy.id.asc(),
        ]).all();
        return rows.map(toAllergyRecord);
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findAllAllergies", cause);
    }
}

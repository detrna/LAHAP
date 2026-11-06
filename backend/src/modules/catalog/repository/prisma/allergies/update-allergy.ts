import type { AllergyRecord } from "../../../service/interfaces/catalog.repository.js";
import {
    AllergyAlreadyExistsError,
    CatalogRepositoryFailureError,
} from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { isAllergyNameConflict } from "./is-allergy-name-conflict.js";
import { toAllergyRecord } from "./to-allergy-record.js";

export async function updateAllergy(
    this: PrismaCatalogRepository,
    id: string,
    name: string,
): Promise<AllergyRecord | null> {
    try {
        const row = await this.db.orm.public.Allergy.where({ id }).update({ name });
        return row === null ? null : toAllergyRecord(row);
    } catch (cause) {
        if (isAllergyNameConflict(cause)) throw new AllergyAlreadyExistsError(name, { cause });
        throw new CatalogRepositoryFailureError("updateAllergy", cause);
    }
}

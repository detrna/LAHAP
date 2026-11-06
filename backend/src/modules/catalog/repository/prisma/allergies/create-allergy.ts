import type { AllergyRecord } from "../../../service/interfaces/catalog.repository.js";
import {
    AllergyAlreadyExistsError,
    CatalogRepositoryFailureError,
} from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { isAllergyNameConflict } from "./is-allergy-name-conflict.js";
import { toAllergyRecord } from "./to-allergy-record.js";

export async function createAllergy(this: PrismaCatalogRepository, name: string): Promise<AllergyRecord> {
    try {
        return toAllergyRecord(await this.db.orm.public.Allergy.create({ name }));
    } catch (cause) {
        if (isAllergyNameConflict(cause)) throw new AllergyAlreadyExistsError(name, { cause });
        throw new CatalogRepositoryFailureError("createAllergy", cause);
    }
}

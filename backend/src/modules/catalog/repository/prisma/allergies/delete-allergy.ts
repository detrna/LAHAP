import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function deleteAllergy(this: PrismaCatalogRepository, id: string): Promise<boolean> {
    try {
        return (await this.db.orm.public.Allergy.where({ id }).deleteAndCount()) > 0;
    } catch (cause) {
        throw new CatalogRepositoryFailureError("deleteAllergy", cause);
    }
}

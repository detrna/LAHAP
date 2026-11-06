import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { AllergyRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";

export async function findAllergiesByIds(
    this: PrismaCatalogRepository,
    ids: readonly string[],
): Promise<readonly AllergyRecord[]> {
    if (ids.length === 0) return [];

    try {
        const rows = await this.db.orm.public.Allergy.where(allergy => allergy.id.in(ids as Varchar<36>[]))
            .orderBy([allergy => allergy.name.asc(), allergy => allergy.id.asc()])
            .all();
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        }));
    } catch (cause) {
        throw new CatalogRepositoryFailureError("findAllergiesByIds", cause);
    }
}

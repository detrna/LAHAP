import { toContainsPattern } from "../../../../../infrastructure/database/prisma/like.js";
import type { AllergyListQuery, AllergyListRecord } from "../../../service/interfaces/catalog.repository.js";
import { CatalogRepositoryFailureError } from "../../../service/interfaces/catalog.repository.js";
import type { PrismaCatalogRepository } from "../catalog-repository.js";
import { toAllergyRecord } from "./to-allergy-record.js";

export async function listAllergies(
    this: PrismaCatalogRepository,
    query: AllergyListQuery,
): Promise<AllergyListRecord> {
    const matching = () => {
        const allergies = this.db.orm.public.Allergy;
        if (query.search === undefined) return allergies;
        const pattern = toContainsPattern(query.search);
        return allergies.where(allergy => allergy.name.ilike(pattern));
    };

    try {
        const [rows, totals] = await Promise.all([
            matching()
                .orderBy([allergy => allergy.name.asc(), allergy => allergy.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matching().aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toAllergyRecord), total: totals.total };
    } catch (cause) {
        throw new CatalogRepositoryFailureError("listAllergies", cause);
    }
}

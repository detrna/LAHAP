import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import { toContainsPattern } from "../../../../infrastructure/database/prisma/like.js";
import type { PromoCodeListQuery, PromoCodeListRecord } from "../../service/interfaces/promo-codes.repository.js";
import { PromoCodesRepositoryFailureError } from "../../service/interfaces/promo-codes.repository.js";
import type { PrismaPromoCodesRepository } from "./promo-codes-repository.js";
import { toPromoCodeRecord } from "./to-promo-code-record.js";

function matchingPromoCodes(orm: Db["orm"], query: PromoCodeListQuery) {
    let promoCodes = orm.public.PromoCode;

    if (query.search !== undefined) {
        const pattern = toContainsPattern(query.search);
        promoCodes = promoCodes.where(item => item.code.ilike(pattern));
    }
    if (query.isActive !== undefined) {
        promoCodes = promoCodes.where({ isActive: query.isActive });
    }

    return promoCodes;
}

export async function listPromoCodes(
    this: PrismaPromoCodesRepository,
    query: PromoCodeListQuery,
): Promise<PromoCodeListRecord> {
    try {
        const [rows, totals] = await Promise.all([
            matchingPromoCodes(this.orm, query)
                .orderBy([item => item.createdAt.desc(), item => item.id.asc()])
                .offset(query.skip)
                .limit(query.take)
                .all(),
            matchingPromoCodes(this.orm, query).aggregate(aggregate => ({ total: aggregate.count() })),
        ]);
        return { items: rows.map(toPromoCodeRecord), total: totals.total };
    } catch (cause) {
        throw new PromoCodesRepositoryFailureError("listPromoCodes", cause);
    }
}

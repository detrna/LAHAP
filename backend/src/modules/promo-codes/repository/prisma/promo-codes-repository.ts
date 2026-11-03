import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { PromoCodesRepository } from "../../service/interfaces/promo-codes.repository.js";

export class PrismaPromoCodesRepository implements PromoCodesRepository {
    constructor(readonly db: Db) {}
}

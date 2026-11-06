import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { PromoCodesRepository } from "../../service/interfaces/promo-codes.repository.js";
import { createPromoCode } from "./create-promo-code.js";
import { deletePromoCode } from "./delete-promo-code.js";
import { findPromoCodeByCode } from "./find-promo-code-by-code.js";
import { findPromoCodeById } from "./find-promo-code-by-id.js";
import { listPromoCodes } from "./list-promo-codes.js";
import { updatePromoCode } from "./update-promo-code.js";

export class PrismaPromoCodesRepository implements PromoCodesRepository {
    constructor(
        readonly db: Db,
        readonly orm: Db["orm"] = db.orm,
    ) {}

    listPromoCodes = listPromoCodes;
    findPromoCodeById = findPromoCodeById;
    findPromoCodeByCode = findPromoCodeByCode;
    createPromoCode = createPromoCode;
    updatePromoCode = updatePromoCode;
    deletePromoCode = deletePromoCode;
}

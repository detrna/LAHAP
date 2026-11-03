import type { SeedContext } from "../../seed-context.js";
import { PROMO_CODES } from "./promo-codes.data.js";

export async function seedPromoCodes({ tx, logger, today }: SeedContext): Promise<number> {
    for (const { id, validForDays, ...promo } of PROMO_CODES) {
        const validUntil = today.add({ days: validForDays }).toPlainDateTime({ hour: 23, minute: 59, second: 59 });
        const row = { ...promo, validUntil, isActive: true };
        await tx.orm.public.PromoCode.upsert({ create: { id, ...row }, update: row });
        logger.info(
            {
                id,
                code: promo.code,
                discountType: promo.discountType,
                discountValue: promo.discountValue,
                validUntil: validUntil.toString(),
            },
            "upserted promo code",
        );
    }
    return PROMO_CODES.length;
}

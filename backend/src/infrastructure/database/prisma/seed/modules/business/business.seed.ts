import type { SeedContext } from "../../seed-context.js";
import { BUSINESS } from "./business.data.js";

export async function seedBusiness({ tx, logger }: SeedContext): Promise<number> {
    const { id, ...fields } = BUSINESS;
    await tx.orm.public.Business.upsert({ create: BUSINESS, update: fields });
    logger.info({ id, name: BUSINESS.name, address: BUSINESS.address }, "upserted business");
    return 1;
}

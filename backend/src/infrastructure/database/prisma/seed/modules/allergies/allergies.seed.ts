import type { SeedContext } from "../../seed-context.js";
import { ALLERGIES } from "./allergies.data.js";

export async function seedAllergies({ tx, logger }: SeedContext): Promise<number> {
    const allergies = Object.values(ALLERGIES);
    for (const allergy of allergies) {
        await tx.orm.public.Allergy.upsert({ create: allergy, update: { name: allergy.name } });
        logger.info({ id: allergy.id, name: allergy.name }, "upserted allergy");
    }
    return allergies.length;
}

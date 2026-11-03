import { ALLERGIES } from "../allergies/allergies.data.js";
import type { SeedContext } from "../../seed-context.js";
import { USERS } from "./users.data.js";

export async function seedUsers({ tx, hasher, logger, password }: SeedContext): Promise<number> {
    const passwordHash = await hasher.hash(password);

    for (const { allergies, ...user } of USERS) {
        const { id, ...fields } = user;
        const row = { ...user, password: passwordHash, isActive: true };
        await tx.orm.public.User.upsert({ create: row, update: { ...fields, password: passwordHash, isActive: true } });

        await tx.orm.public.UserAllergy.where({ userId: id }).deleteAll();
        if (allergies.length > 0) {
            await tx.orm.public.UserAllergy.createAll(
                allergies.map(key => ({ userId: id, allergyId: ALLERGIES[key].id })),
            );
        }
        logger.info({ id, role: user.role, name: user.name, phone: user.phone, allergies }, "upserted user");
    }
    return USERS.length;
}

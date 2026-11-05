import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Db } from "../../../src/infrastructure/database/prisma/db.js";

export async function withOtherAdminsInactive<T>(
    db: Db,
    keepIds: readonly string[],
    run: () => Promise<T>,
): Promise<T> {
    const activeAdmins = await db.orm.public.User.where({ role: "ADMIN", isActive: true }).select("id").all();
    const otherIds = activeAdmins.map(admin => admin.id).filter(id => !keepIds.includes(id)) as Varchar<36>[];
    if (otherIds.length > 0) {
        await db.orm.public.User.where(user => user.id.in(otherIds)).updateAndCount({ isActive: false });
    }
    try {
        return await run();
    } finally {
        if (otherIds.length > 0) {
            await db.orm.public.User.where(user => user.id.in(otherIds)).updateAndCount({ isActive: true });
        }
    }
}

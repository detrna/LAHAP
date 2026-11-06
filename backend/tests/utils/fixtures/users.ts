import type { CreatedRows } from "../../../src/infrastructure/database/prisma/cleanup.js";
import type { Db } from "../../../src/infrastructure/database/prisma/db.js";
import type { Role } from "../../../src/shared/auth/roles.js";

export interface TestUserInput {
    readonly name?: string | undefined;
    readonly role?: Role | undefined;
    readonly allergyIds?: readonly string[] | undefined;
    readonly allergyNote?: string | undefined;
}

const randomPhone = () =>
    `62897${Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, "0")}`;

export async function createTestUser(db: Db, rows: CreatedRows, input: TestUserInput = {}): Promise<string> {
    const created = await db.orm.public.User.create({
        name: input.name ?? "Zz Test User",
        phone: randomPhone(),
        password: "$2b$10$fixturehashfixturehashfixturehashfixturehashfixtur",
        role: input.role ?? "CUSTOMER",
        allergyNote: input.allergyNote ?? null,
    });
    const allergyIds = input.allergyIds ?? [];
    if (allergyIds.length > 0) {
        await db.orm.public.UserAllergy.createAll(allergyIds.map(allergyId => ({ userId: created.id, allergyId })));
    }
    return rows.track("User", created.id);
}

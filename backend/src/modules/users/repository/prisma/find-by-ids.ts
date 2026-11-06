import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { UserRecord } from "../../service/interfaces/users.repository.js";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import { usersWithAllergyIds } from "./queries.js";
import { toUserRecord } from "./to-user-record.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function findByIds(this: PrismaUsersRepository, ids: readonly string[]): Promise<readonly UserRecord[]> {
    if (ids.length === 0) return [];
    try {
        const rows = await usersWithAllergyIds(this.db.orm)
            .where(user => user.id.in(ids as Varchar<36>[]))
            .all();
        return rows.map(toUserRecord);
    } catch (cause) {
        throw new UsersRepositoryFailureError("findByIds", cause);
    }
}

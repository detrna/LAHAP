import type { UserRecord } from "../../service/interfaces/users.repository.js";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import { usersWithAllergies } from "./queries.js";
import { toUserRecord } from "./to-user-record.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function findById(this: PrismaUsersRepository, id: string): Promise<UserRecord | null> {
    try {
        const row = await usersWithAllergies(this.db.orm).where({ id }).first();
        return row === null ? null : toUserRecord(row);
    } catch (cause) {
        throw new UsersRepositoryFailureError("findById", cause);
    }
}

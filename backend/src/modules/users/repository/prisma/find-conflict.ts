import type { UniqueUserField } from "../../domain/errors.js";
import type { UserConflictQuery } from "../../service/interfaces/users.repository.js";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function findConflict(
    this: PrismaUsersRepository,
    query: UserConflictQuery,
): Promise<UniqueUserField | null> {
    try {
        const users = this.db.orm.public.User.where(user => user.id.neq(query.exceptId)).select("id");
        if (query.phone !== undefined && (await users.where({ phone: query.phone }).first()) !== null) {
            return "phone";
        }
        if (query.email !== undefined && (await users.where({ email: query.email }).first()) !== null) {
            return "email";
        }
        return null;
    } catch (cause) {
        throw new UsersRepositoryFailureError("findConflict", cause);
    }
}

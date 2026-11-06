import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import type { Role } from "../../../../shared/auth/roles.js";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function filterActiveUserIds(
    this: PrismaUsersRepository,
    ids: readonly string[],
    role: Role,
): Promise<readonly string[]> {
    if (ids.length === 0) return [];
    try {
        const rows = await this.db.orm.public.User.where(user => user.id.in(ids as Varchar<36>[]))
            .where({ role, isActive: true })
            .select("id")
            .all();
        return rows.map(row => row.id);
    } catch (cause) {
        throw new UsersRepositoryFailureError("filterActiveUserIds", cause);
    }
}

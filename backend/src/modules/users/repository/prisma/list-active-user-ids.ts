import type { Role } from "../../../../shared/auth/roles.js";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function listActiveUserIds(this: PrismaUsersRepository, role: Role): Promise<readonly string[]> {
    try {
        const rows = await this.db.orm.public.User.where({ role, isActive: true })
            .select("id")
            .orderBy([user => user.id.asc()])
            .all();
        return rows.map(row => row.id);
    } catch (cause) {
        throw new UsersRepositoryFailureError("listActiveUserIds", cause);
    }
}

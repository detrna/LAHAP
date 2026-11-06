import type { Role } from "../../../../shared/auth/roles.js";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function countActiveUsers(this: PrismaUsersRepository, role: Role): Promise<number> {
    try {
        const totals = await this.db.orm.public.User.where({ role, isActive: true }).aggregate(aggregate => ({
            total: aggregate.count(),
        }));
        return totals.total;
    } catch (cause) {
        throw new UsersRepositoryFailureError("countActiveUsers", cause);
    }
}

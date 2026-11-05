import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function updatePasswordHash(
    this: PrismaUsersRepository,
    id: string,
    passwordHash: string,
): Promise<boolean> {
    try {
        return (await this.db.orm.public.User.where({ id }).updateAndCount({ password: passwordHash })) > 0;
    } catch (cause) {
        throw new UsersRepositoryFailureError("updatePasswordHash", cause);
    }
}

import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import type { PrismaUsersRepository } from "./users-repository.js";

async function existsBy(
    repository: PrismaUsersRepository,
    filter: { readonly phone: string } | { readonly email: string },
    operation: string,
): Promise<boolean> {
    try {
        return (await repository.db.orm.public.User.where(filter).select("id").first()) !== null;
    } catch (cause) {
        throw new UsersRepositoryFailureError(operation, cause);
    }
}

export async function existsByPhone(this: PrismaUsersRepository, phone: string): Promise<boolean> {
    return existsBy(this, { phone }, "existsByPhone");
}

export async function existsByEmail(this: PrismaUsersRepository, email: string): Promise<boolean> {
    return existsBy(this, { email }, "existsByEmail");
}

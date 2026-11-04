import type { UserCredentialsRecord } from "../../service/interfaces/users.repository.js";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import { usersWithAllergies } from "./queries.js";
import { toUserRecord } from "./to-user-record.js";
import type { PrismaUsersRepository } from "./users-repository.js";

async function findCredentialsBy(
    repository: PrismaUsersRepository,
    filter: { readonly phone: string } | { readonly email: string },
    operation: string,
): Promise<UserCredentialsRecord | null> {
    try {
        const row = await usersWithAllergies(repository.db.orm).where(filter).first();
        return row === null ? null : { user: toUserRecord(row), passwordHash: row.password };
    } catch (cause) {
        throw new UsersRepositoryFailureError(operation, cause);
    }
}

export async function findCredentialsByPhone(
    this: PrismaUsersRepository,
    phone: string,
): Promise<UserCredentialsRecord | null> {
    return findCredentialsBy(this, { phone }, "findCredentialsByPhone");
}

export async function findCredentialsByEmail(
    this: PrismaUsersRepository,
    email: string,
): Promise<UserCredentialsRecord | null> {
    return findCredentialsBy(this, { email }, "findCredentialsByEmail");
}

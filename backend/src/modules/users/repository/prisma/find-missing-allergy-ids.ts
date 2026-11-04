import type { Varchar } from "@prisma/orm-postgres/contract-builder";
import { UsersRepositoryFailureError } from "../../service/interfaces/users.repository.js";
import type { PrismaUsersRepository } from "./users-repository.js";

export async function findMissingAllergyIds(
    this: PrismaUsersRepository,
    ids: readonly string[],
): Promise<readonly string[]> {
    if (ids.length === 0) return [];

    try {
        const found = await this.db.orm.public.Allergy.where(allergy => allergy.id.in(ids as Varchar<36>[]))
            .select("id")
            .all();
        const foundIds = new Set<string>(found.map(allergy => allergy.id));
        return ids.filter(id => !foundIds.has(id));
    } catch (cause) {
        throw new UsersRepositoryFailureError("findMissingAllergyIds", cause);
    }
}

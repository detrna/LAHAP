import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";

/**
 * Prisma implementation of `UsersRepository` (an adapter: only the container imports it). Each method lives in
 * `./<action>.ts` as a function with a `this: PrismaUsersRepository` receiver and is attached here (`findById = findById;`).
 */
export class PrismaUsersRepository implements UsersRepository {
    constructor(readonly db: Db) {}
}

import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { UsersRepository } from "../../service/interfaces/users.repository.js";

export class PrismaUsersRepository implements UsersRepository {
    constructor(readonly db: Db) {}
}

import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { IngredientsRepository } from "../../service/interfaces/ingredients.repository.js";

export class PrismaIngredientsRepository implements IngredientsRepository {
    constructor(readonly db: Db) {}
}

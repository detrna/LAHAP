import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { IngredientsRepository } from "../../service/interfaces/ingredients.repository.js";
import { createMany } from "./create-many.js";
import { deleteMany } from "./delete-many.js";
import { findById } from "./find-by-id.js";
import { findByIds } from "./find-by-ids.js";
import { findMissingIds } from "./find-missing-ids.js";
import { list } from "./list.js";
import { updateMany } from "./update-many.js";

export class PrismaIngredientsRepository implements IngredientsRepository {
    constructor(readonly db: Db) {}

    list = list;
    findById = findById;
    findByIds = findByIds;
    findMissingIds = findMissingIds;
    createMany = createMany;
    updateMany = updateMany;
    deleteMany = deleteMany;
}

import type { Db } from "../../../../infrastructure/database/prisma/db.js";
import type { CatalogRepository } from "../../service/interfaces/catalog.repository.js";

export class PrismaCatalogRepository implements CatalogRepository {
    constructor(readonly db: Db) {}
}

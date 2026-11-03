import type { Db } from "../infrastructure/database/prisma/db.js";
import type { Adapters } from "../infrastructure/index.js";

export interface ModuleDeps {
    readonly db: Db;
    readonly adapters: Adapters;
}

import type { Db } from "../infrastructure/database/prisma/db.js";
import type { Adapters } from "../infrastructure/index.js";

/** What every module container receives. Cross-module services are added per container. */
export interface ModuleDeps {
    readonly db: Db;
    readonly adapters: Adapters;
}

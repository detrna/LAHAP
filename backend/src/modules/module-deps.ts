import type { HttpConfig } from "../config/http.js";
import type { Db } from "../infrastructure/database/prisma/db.js";
import type { Adapters } from "../infrastructure/index.js";

export interface ModuleDeps {
    readonly db: Db;
    readonly adapters: Adapters;
    readonly http: HttpConfig;
}

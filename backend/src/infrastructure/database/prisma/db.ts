// src/infrastructure/db/client.ts
import postgres from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { DatabaseConfig } from "../../../config/db.js";
import type { Contract } from "./contract.js";
import contractJson from "./contract.json" with { type: "json" };

export const contract = contractFromJson<Contract>(contractJson);

export const createDb = (config: DatabaseConfig) => postgres({ contract, url: config.DATABASE_URL });

export const verifyConnection = async (db: Db): Promise<void> => {
    try {
        const plan = db.raw.sql`SELECT 1 AS ok`.returnsRow({ ok: "pg/int4@1" }).build();
        await db.query(plan);
    } catch (err) {
        throw new Error(`Failed to connect to the database: ${err instanceof Error ? err.message : String(err)}`);
    }
};

export type Db = ReturnType<typeof createDb>;

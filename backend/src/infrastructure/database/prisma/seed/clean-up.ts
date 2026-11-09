import "dotenv/config";
import { loadAppConfig } from "../../../../config/app.js";
import { dbEnvSchema, toDatabaseConfig } from "../../../../config/db.js";
import { parseEnv } from "../../../../config/index.js";
import { DEFAULT_LOGGER_CONFIG, loadLoggerConfig } from "../../../../config/logger.js";
import type { Logger } from "../../../../shared/ports/logger/logger.js";
import { PinoLogger } from "../../../logger/pino/pino.js";
import { loadDatabase } from "../db.js";
import { truncateAllTables } from "./reset.js";

let logger: Logger = new PinoLogger(DEFAULT_LOGGER_CONFIG, { destination: process.stdout });

async function main(): Promise<void> {
    logger = new PinoLogger(loadLoggerConfig(), { destination: process.stdout }).child({ script: "clean-up" });

    if (loadAppConfig().IS_PRODUCTION) {
        throw new Error("refusing to clean up the database while IS_PRODUCTION=true");
    }

    const db = await loadDatabase(toDatabaseConfig(parseEnv(dbEnvSchema)));
    try {
        const tables = await db.transaction(tx => truncateAllTables(tx));
        logger.info({ tables }, "every table in the public schema was truncated");
    } finally {
        await db.close();
    }
}

main().catch((error: unknown) => {
    logger.error({ error }, "clean-up failed; the transaction was rolled back and nothing was deleted");
    process.exitCode = 1;
});

import "dotenv/config";
import { loadAppConfig } from "../../../../config/app.js";
import { dbEnvSchema, toDatabaseConfig } from "../../../../config/db.js";
import { parseEnv } from "../../../../config/index.js";
import { DEFAULT_LOGGER_CONFIG, loadLoggerConfig } from "../../../../config/logger.js";
import type { Logger } from "../../../../shared/ports/logger/logger.js";
import { PinoLogger } from "../../../logger/pino/pino.js";
import { loadDatabase } from "../db.js";
import { cleanSeed } from "./clean-seed.js";

let logger: Logger = new PinoLogger(DEFAULT_LOGGER_CONFIG, { destination: process.stdout });

async function main(): Promise<void> {
    logger = new PinoLogger(loadLoggerConfig(), { destination: process.stdout }).child({ script: "clean-seed" });

    if (loadAppConfig().IS_PRODUCTION) {
        throw new Error("refusing to clean seed data while IS_PRODUCTION=true");
    }

    const db = await loadDatabase(toDatabaseConfig(parseEnv(dbEnvSchema)));
    try {
        const totals = await db.transaction(tx => cleanSeed(tx, logger));
        logger.info({ totals }, "seeded data cleaned successfully");
    } finally {
        await db.close();
    }
}

main().catch((error: unknown) => {
    logger.error({ error }, "clean-seed failed; the transaction was rolled back and nothing was deleted");
    process.exitCode = 1;
});


import { z } from "zod";
import { createApp } from "./app.js";
import { loadConfig } from "./config/index.js";
import { DEFAULT_LOGGER_CONFIG } from "./config/logger.js";
import { loadDatabase } from "./infrastructure/database/prisma/db.js";
import { createInfrastructure } from "./infrastructure/index.js";
import { PinoLogger } from "./infrastructure/logger/pino/pino.js";
import type { Logger } from "./shared/ports/logger/logger.js";

async function bootstrap() {
    let logger: Logger = new PinoLogger(DEFAULT_LOGGER_CONFIG);

    try {
        const config = loadConfig();
        const infrastructure = await createInfrastructure(config);
        logger = infrastructure.logger;

        const db = await loadDatabase(config.DATABASE);
        logger.info("Database connected successfully");

        logger.info("Infrastructure initialized successfully");

        const app = createApp(infrastructure);
        const server = app.listen(config.APP.PORT, () => {
            logger.info(`Server is running on port ${config.APP.PORT}`);
        });

        const shutdown = () => {
            server.close(async () => {
                await Promise.all([db.close(), infrastructure.cache.close()]);
                process.exit(0);
            });
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    } catch (err) {
        if (err instanceof z.ZodError) {
            logger.error({ issues: err.issues }, "Invalid configuration:");
            for (const issue of err.issues) {
                logger.error({ path: issue.path.join("."), issue: issue.message }, `  ${issue.path.join(".")}: ${issue.message}`);
            }
        } else {
            logger.error({ err }, "Startup failed");
        }
        process.exit(1);
    }
}

await bootstrap();

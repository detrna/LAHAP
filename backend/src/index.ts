import { z } from "zod";
import { createApp } from "./app.js";
import { loadConfig } from "./config/index.js";
import { DEFAULT_LOGGER_CONFIG } from "./config/logger.js";
import { loadDatabase } from "./infrastructure/database/prisma/db.js";
import { createAdapters } from "./infrastructure/index.js";
import { PinoLogger } from "./infrastructure/logger/pino/pino.js";
import type { Logger } from "./shared/ports/logger/logger.js";

async function bootstrap() {
    let logger: Logger = new PinoLogger(DEFAULT_LOGGER_CONFIG);

    try {
        const config = loadConfig();
        // Independent connections, so connect in parallel. On failure the process exits below.
        const [adapters, db] = await Promise.all([createAdapters(config), loadDatabase(config.DATABASE)]);
        logger = adapters.logger;
        logger.info("Adapters and database initialized successfully");

        const { app, start, close } = createApp({ db, adapters, http: config.HTTP });
        await start();
        const server = app.listen(config.APP.PORT, () => {
            logger.info(`Server is running on port ${config.APP.PORT}`);
        });

        const shutdown = () => {
            const streamsClosed = close();
            server.close(async () => {
                await streamsClosed;
                await Promise.all([db.close(), adapters.cache.close(), adapters.eventBus.close()]);
                process.exit(0);
            });
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);
    } catch (err) {
        if (err instanceof z.ZodError) {
            logger.error({ issues: err.issues }, "Invalid configuration:");
            for (const issue of err.issues) {
                logger.error(
                    { path: issue.path.join("."), issue: issue.message },
                    `  ${issue.path.join(".")}: ${issue.message}`,
                );
            }
        } else {
            logger.error({ err }, "Startup failed");
        }
        process.exit(1);
    }
}

await bootstrap();
